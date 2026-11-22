import type { QueryClient } from "@tanstack/react-query";
import type {
  CreateReceiptInput,
  ExpenseCategoryDto,
  MerchantDto,
  MonthlyBudgetSummaryDto,
  ReceiptDetailDto,
  ReceiptItemDto,
  ReceiptSummaryDto,
  UpdateReceiptInput,
  UpsertMonthlyBudgetInput,
} from "@app/modules/schemas";
import { budgetKeys } from "../api/budget.keys";
import { createOptimisticId } from "@/lib/optimistic";
import { toLocalMonthRange } from "./budget-date.utils";

interface ReceiptFilters { yearMonth?: string; merchantId?: string; categoryId?: string }

function categories(client: QueryClient): ExpenseCategoryDto[] {
  return client.getQueryData<ExpenseCategoryDto[]>(budgetKeys.categories()) ?? [];
}

function findCategory(client: QueryClient, id: string): ExpenseCategoryDto | undefined {
  return categories(client).find((category) => category.id === id);
}

function merchantSummary(client: QueryClient, input: CreateReceiptInput): ReceiptDetailDto["merchant"] {
  if ("merchantId" in input && input.merchantId) {
    const merchant = client.getQueryData<MerchantDto[]>(budgetKeys.merchants())?.find((item) => item.id === input.merchantId);
    if (merchant) return { id: merchant.id, userId: merchant.userId, name: merchant.name, defaultCategoryId: merchant.defaultCategoryId, createdAt: merchant.createdAt, updatedAt: merchant.updatedAt };
  }
  const name = "merchantName" in input ? input.merchantName : "";
  return name ? {
    id: createOptimisticId().replace("temp-", ""),
    userId: "00000000-0000-0000-0000-000000000000",
    name,
    defaultCategoryId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null;
}

function matchesFilters(filters: ReceiptFilters, receipt: ReceiptSummaryDto, inputMonth: string): boolean {
  if (filters.yearMonth && filters.yearMonth !== inputMonth) return false;
  if (filters.merchantId && receipt.merchant?.id !== filters.merchantId) return false;
  if (filters.categoryId && !receipt.categorySummary.some((item) => item.category.id === filters.categoryId)) return false;
  return true;
}

function patchReceiptLists(client: QueryClient, patch: (receipt: ReceiptSummaryDto) => ReceiptSummaryDto | null): void {
  for (const [key, data] of client.getQueriesData<ReceiptSummaryDto[]>({ queryKey: budgetKeys.receipts() })) {
    if (!data) continue;
    const next = data.flatMap((receipt) => {
      const updated = patch(receipt);
      return updated ? [updated] : [];
    });
    client.setQueryData(key, next);
  }
}

export function insertOptimisticReceipt(client: QueryClient, input: CreateReceiptInput): ReceiptDetailDto {
  const id = createOptimisticId();
  const now = new Date().toISOString();
  const merchant = merchantSummary(client, input);
  const items: ReceiptItemDto[] = input.items.map((item, index) => {
    const category = findCategory(client, item.categoryId);
    return {
      id: createOptimisticId(),
      receiptId: id,
      name: item.name,
      rawReceiptText: item.rawReceiptText ?? null,
      category: category ?? {
        id: item.categoryId, userId: null, slug: "other", label: "Other", i18nKey: "budget.categories.other",
        iconName: null, colorToken: null, sortOrder: 0, createdAt: now, updatedAt: now,
      },
      quantity: item.quantity ?? 1,
      unit: item.unit ?? null,
      amount: item.amount,
      unitPrice: item.amount / (item.quantity ?? 1),
      inventoryItemId: item.inventoryItemId ?? null,
      ingredientId: item.ingredientId ?? null,
      sortOrder: index,
    };
  });
  const categoryMap = new Map<string, { category: ExpenseCategoryDto; amount: number; itemCount: number }>();
  for (const item of items) {
    const current = categoryMap.get(item.category.id) ?? { category: item.category, amount: 0, itemCount: 0 };
    current.amount += item.amount;
    current.itemCount += 1;
    categoryMap.set(item.category.id, current);
  }
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const detail: ReceiptDetailDto = {
    id, userId: "00000000-0000-0000-0000-000000000000", merchant, source: input.source,
    title: input.title ?? merchant?.name ?? null, purchasedAt: input.purchasedAt, currency: input.currency,
    totalAmount, itemCount: items.length,
    categorySummary: [...categoryMap.values()].map(({ category, amount, itemCount }) => ({ category, amount, itemCount })),
    createdAt: now, updatedAt: now, mediaAssetId: input.mediaAssetId ?? null,
    mediaUrl: null, notes: input.notes ?? null, items,
  };
  client.setQueryData(budgetKeys.receiptDetail(id), detail);
  const yearMonth = input.purchasedAt.slice(0, 7);
  for (const [key, data] of client.getQueriesData<ReceiptSummaryDto[]>({ queryKey: budgetKeys.receipts() })) {
    if (!data) continue;
    const filters = key[2] as ReceiptFilters | undefined;
    if (filters && !matchesFilters(filters, detail, yearMonth)) continue;
    client.setQueryData(key, [detail, ...data]);
  }
  patchCreateSummary(client, detail, yearMonth);
  return detail;
}

function patchCreateSummary(client: QueryClient, receipt: ReceiptSummaryDto, yearMonth: string): void {
  for (const [key, data] of client.getQueriesData<MonthlyBudgetSummaryDto>({ queryKey: budgetKeys.summary(yearMonth) })) {
    if (!data) continue;
    const next = { ...data };
    next.receiptCount += 1;
    next.itemCount += receipt.itemCount;
    const currency = next.budget?.currency ?? receipt.currency;
    if (currency === receipt.currency) next.totalSpent = (next.totalSpent ?? 0) + receipt.totalAmount;
    next.dailyAverageSpend = next.dailyAverageSpend === null ? receipt.totalAmount : next.dailyAverageSpend + receipt.totalAmount;
    const spentCurrency = next.spendByCurrency.find((item) => item.currency === receipt.currency);
    if (spentCurrency) spentCurrency.amount += receipt.totalAmount;
    else next.spendByCurrency = [...next.spendByCurrency, { currency: receipt.currency, amount: receipt.totalAmount }];
    for (const item of receipt.categorySummary) {
      const category = next.categoryBreakdown.find((entry) => entry.categoryId === item.category.id);
      if (category && currency === receipt.currency) category.spentAmount += item.amount;
      if (category) category.itemCount += item.itemCount;
      if (category) category.spentByCurrency = category.spentByCurrency.map((entry) => entry.currency === receipt.currency
        ? { ...entry, amount: entry.amount + item.amount }
        : entry);
    }
    if (receipt.merchant) {
      const merchant = next.merchantBreakdown.find((entry) => entry.merchantId === receipt.merchant?.id);
      if (merchant) merchant.receiptCount += 1;
    }
    client.setQueryData(key, next);
  }
}

export function replaceOptimisticReceipt(client: QueryClient, optimisticId: string, receipt: ReceiptDetailDto): void {
  client.removeQueries({ queryKey: budgetKeys.receiptDetail(optimisticId) });
  client.setQueryData(budgetKeys.receiptDetail(receipt.id), receipt);
  patchReceiptLists(client, (item) => item.id === optimisticId ? receipt : item);
  for (const [key, data] of client.getQueriesData<MonthlyBudgetSummaryDto>({ queryKey: budgetKeys.all })) {
    if (data?.categoryBreakdown) client.setQueryData(key, data);
  }
}
