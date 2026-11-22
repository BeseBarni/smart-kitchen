import type { QueryClient } from "@tanstack/react-query";
import type {
  ExpenseCategoryDto,
  MonthlyBudgetSummaryDto,
  ReceiptDetailDto,
  ReceiptSummaryDto,
  UpdateReceiptInput,
  UpsertMonthlyBudgetInput,
} from "@app/modules/schemas";
import { budgetKeys } from "../api/budget.keys";
import { createOptimisticId } from "@/lib/optimistic";

export function patchUpdateReceipt(client: QueryClient, id: string, input: UpdateReceiptInput): void {
  const old = client.getQueryData<ReceiptDetailDto>(budgetKeys.receiptDetail(id));
  if (!old) return;
  const now = new Date().toISOString();
  const categoryList = client.getQueryData<ExpenseCategoryDto[]>(budgetKeys.categories()) ?? [];
  const items = input.items
    ? input.items.flatMap((item, index) => {
        const category = categoryList.find((entry) => entry.id === item.categoryId)
          ?? old.items.find((oldItem) => oldItem.category.id === item.categoryId)?.category
          ?? old.categorySummary.find((entry) => entry.category.id === item.categoryId)?.category
          ?? old.items[index]?.category;
        if (!category) return [];
        return [{
          id: createOptimisticId(),
          receiptId: id,
          name: item.name,
          rawReceiptText: item.rawReceiptText ?? null,
          category,
          quantity: item.quantity ?? 1,
          unit: item.unit ?? null,
          amount: item.amount,
          unitPrice: item.amount / (item.quantity ?? 1),
          inventoryItemId: item.inventoryItemId ?? null,
          ingredientId: item.ingredientId ?? null,
          sortOrder: index,
        }];
      })
    : old.items;
  const next: ReceiptDetailDto = {
    ...old,
    merchant: input.merchantId
      ? old.merchant
      : input.merchantName
        ? { ...old.merchant, id: createOptimisticId(), name: input.merchantName } as ReceiptDetailDto["merchant"]
        : old.merchant,
    source: input.source ?? old.source,
    purchasedAt: input.purchasedAt ?? old.purchasedAt,
    currency: input.currency ?? old.currency,
    title: input.title === undefined ? old.title : input.title,
    notes: input.notes === undefined ? old.notes : input.notes,
    mediaAssetId: input.mediaAssetId === undefined ? old.mediaAssetId : input.mediaAssetId,
    items,
    itemCount: items.length,
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    updatedAt: now,
  };
  next.categorySummary = [];
  for (const item of items) {
    const found = next.categorySummary.find((entry) => entry.category.id === item.category.id);
    if (found) {
      found.amount += item.amount;
      found.itemCount += 1;
    } else next.categorySummary.push({ category: item.category, amount: item.amount, itemCount: 1 });
  }
  client.setQueryData(budgetKeys.receiptDetail(id), next);
  for (const [key, data] of client.getQueriesData<ReceiptSummaryDto[]>({ queryKey: budgetKeys.receipts() })) {
    if (!data) continue;
    const filters = key[2] as { yearMonth?: string; merchantId?: string; categoryId?: string } | undefined;
    client.setQueryData(key, data.flatMap((receipt) => {
      if (receipt.id !== id) return [receipt];
      if (filters?.merchantId && next.merchant?.id !== filters.merchantId) return [];
      if (filters?.categoryId && !next.categorySummary.some((entry) => entry.category.id === filters.categoryId)) return [];
      return [next];
    }));
  }
  const yearMonth = (input.purchasedAt ?? old.purchasedAt).slice(0, 7);
  for (const [key, data] of client.getQueriesData<MonthlyBudgetSummaryDto>({ queryKey: budgetKeys.summary(yearMonth) })) {
    if (!data) continue;
    const nextSummary = { ...data };
    const currency = data.budget?.currency ?? old.currency;
    if (currency === old.currency) {
      nextSummary.totalSpent = Math.max(0, (nextSummary.totalSpent ?? 0) - old.totalAmount);
      if (currency === next.currency) nextSummary.totalSpent = (nextSummary.totalSpent ?? 0) + next.totalAmount;
    }
    nextSummary.itemCount = Math.max(0, nextSummary.itemCount - old.itemCount) + next.itemCount;
    for (const oldItem of old.categorySummary) {
      const category = nextSummary.categoryBreakdown.find((entry) => entry.categoryId === oldItem.category.id);
      if (category) {
        category.spentAmount = Math.max(0, category.spentAmount - oldItem.amount);
        category.itemCount = Math.max(0, category.itemCount - oldItem.itemCount);
      }
    }
    for (const nextItem of next.categorySummary) {
      const category = nextSummary.categoryBreakdown.find((entry) => entry.categoryId === nextItem.category.id);
      if (category) {
        category.spentAmount += nextItem.amount;
        category.itemCount += nextItem.itemCount;
      }
    }
    client.setQueryData(key, nextSummary);
  }
}

export function patchDeleteReceipt(client: QueryClient, id: string): void {
  const detail = client.getQueryData<ReceiptDetailDto>(budgetKeys.receiptDetail(id));
  client.removeQueries({ queryKey: budgetKeys.receiptDetail(id) });
  for (const [key, data] of client.getQueriesData<ReceiptSummaryDto[]>({ queryKey: budgetKeys.receipts() })) {
    if (data) client.setQueryData(key, data.filter((receipt) => receipt.id !== id));
  }
  if (!detail) return;
  const yearMonth = detail.purchasedAt.slice(0, 7);
  for (const [key, data] of client.getQueriesData<MonthlyBudgetSummaryDto>({ queryKey: budgetKeys.summary(yearMonth) })) {
    if (!data) continue;
    const next = { ...data };
    next.receiptCount = Math.max(0, next.receiptCount - 1);
    next.itemCount = Math.max(0, next.itemCount - detail.itemCount);
    if (next.budget?.currency === detail.currency) next.totalSpent = Math.max(0, (next.totalSpent ?? 0) - detail.totalAmount);
    next.spendByCurrency = next.spendByCurrency.map((entry) => entry.currency === detail.currency
      ? { ...entry, amount: Math.max(0, entry.amount - detail.totalAmount) }
      : entry);
    for (const item of detail.categorySummary) {
      const category = next.categoryBreakdown.find((entry) => entry.categoryId === item.category.id);
      if (category) {
        category.spentAmount = Math.max(0, category.spentAmount - item.amount);
        category.itemCount = Math.max(0, category.itemCount - item.itemCount);
      }
    }
    client.setQueryData(key, next);
  }
}

export function patchUpsertBudget(client: QueryClient, yearMonth: string, input: UpsertMonthlyBudgetInput): void {
  for (const [key, data] of client.getQueriesData<MonthlyBudgetSummaryDto>({ queryKey: budgetKeys.summary(yearMonth) })) {
    if (!data) continue;
    const spent = data.budget?.currency === input.currency ? data.totalSpent ?? 0 : 0;
    const remaining = input.totalLimitAmount - spent;
    const status = input.totalLimitAmount <= 0 && spent > 0
      ? "over_budget"
      : spent / input.totalLimitAmount >= 1
        ? "over_budget"
        : spent / input.totalLimitAmount >= 0.8
          ? "near_limit"
          : "on_track";
    const next: MonthlyBudgetSummaryDto = {
      ...data,
      budget: data.budget ? { ...data.budget, totalLimitAmount: input.totalLimitAmount, currency: input.currency } : {
        id: createOptimisticId(),
        yearMonth,
        currency: input.currency,
        totalLimitAmount: input.totalLimitAmount,
      },
      isInherited: false,
      remainingAmount: remaining,
      status,
      categoryBreakdown: data.categoryBreakdown.map((category) => ({
        ...category,
        limitAmount: input.categoryLimits.find((limit) => limit.categoryId === category.categoryId)?.limitAmount ?? null,
      })),
    };
    client.setQueryData(key, next);
  }
}
