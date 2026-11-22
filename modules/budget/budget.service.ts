import { err, ok, type AppError, type Result } from "@app/shared";
import * as categoriesService from "./expense-categories.service";
import { findBudgetForMonth, upsertBudget } from "./budget.repo";
import { getSpendAggregates } from "./budget-spend.repo";
import { sumNumericMoney } from "./money.utils";
import type { BudgetSummaryQuery, MonthlyBudgetSummaryDto, UpsertMonthlyBudgetInput } from "./budget.schema";
import type { CategorySpendRow, MerchantSpendRow } from "./budget-spend.repo";

function monthWindow(yearMonth: string, from?: string, to?: string): { start: Date; end: Date } {
  const [yearText = "", monthText = "1"] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return {
    start: from ? new Date(from) : new Date(Date.UTC(year, month - 1, 1)),
    end: to ? new Date(to) : new Date(Date.UTC(year, month, 1)),
  };
}

function daysForMonth(yearMonth: string): number {
  const [yearText = "", monthText = "1"] = yearMonth.split("-");
  return new Date(Date.UTC(Number(yearText), Number(monthText), 0)).getUTCDate();
}

function elapsedDays(yearMonth: string, daysInMonth: number): number {
  const [yearText = "", monthText = "1"] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const now = new Date();
  const targetIndex = year * 12 + month;
  const currentIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (targetIndex > currentIndex) return 0;
  if (targetIndex < currentIndex) return daysInMonth;
  return Math.min(daysInMonth, now.getUTCDate());
}

function amountsByCurrency(rows: Array<{ currency: string; spentAmount: string }>) {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    grouped.set(row.currency, [...(grouped.get(row.currency) ?? []), row.spentAmount]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amounts]) => ({ currency, amount: sumNumericMoney(amounts) }));
}

function makeCategoryBreakdown(
  rows: CategorySpendRow[],
  budgetCurrency: string | undefined,
  limits: Map<string, number>,
) {
  const grouped = new Map<string, CategorySpendRow[]>();
  for (const row of rows) grouped.set(row.categoryId, [...(grouped.get(row.categoryId) ?? []), row]);
  return [...grouped.entries()].map(([categoryId, entries]) => {
    const first = entries[0]!;
    const limitAmount = limits.get(categoryId) ?? null;
    const spent = sumNumericMoney(entries
      .filter((entry) => entry.currency === budgetCurrency)
      .map((entry) => entry.spentAmount));
    return {
      categoryId,
      slug: first.slug,
      label: first.label,
      i18nKey: first.i18nKey,
      iconName: first.iconName,
      colorToken: first.colorToken,
      spentAmount: spent,
      spentByCurrency: amountsByCurrency(entries),
      percentage: limitAmount && limitAmount > 0 ? spent / limitAmount * 100 : null,
      itemCount: entries.reduce((sum, entry) => sum + entry.itemCount, 0),
      limitAmount,
    };
  });
}

function makeMerchantBreakdown(rows: MerchantSpendRow[], budgetCurrency: string | undefined) {
  const grouped = new Map<string, MerchantSpendRow[]>();
  for (const row of rows) grouped.set(row.merchantId, [...(grouped.get(row.merchantId) ?? []), row]);
  return [...grouped.entries()].map(([merchantId, entries]) => ({
    merchantId,
    name: entries[0]!.name,
    spentAmount: sumNumericMoney(entries
      .filter((entry) => entry.currency === budgetCurrency)
      .map((entry) => entry.spentAmount)),
    spentByCurrency: amountsByCurrency(entries),
    receiptCount: entries.reduce((sum, entry) => sum + entry.receiptCount, 0),
  })).sort((left, right) => right.spentAmount - left.spentAmount || left.name.localeCompare(right.name));
}

export async function getMonthlySummary(
  userId: string,
  query: BudgetSummaryQuery,
): Promise<Result<MonthlyBudgetSummaryDto, AppError>> {
  const [budgetResult, categoryResult] = await Promise.all([
    findBudgetForMonth(userId, query.yearMonth),
    categoriesService.listAvailable(userId),
  ]);
  if (!budgetResult.success) return err(budgetResult.error);
  if (!categoryResult.success) return err(categoryResult.error);
  const window = monthWindow(query.yearMonth, query.from, query.to);
  const spendResult = await getSpendAggregates(userId, window.start, window.end);
  if (!spendResult.success) return err(spendResult.error);
  const selected = budgetResult.data;
  const budgetCurrency = selected?.budget.currency;
  const spent = amountsByCurrency(spendResult.data.categoryRows)
    .find((amount) => amount.currency === budgetCurrency)?.amount ?? 0;
  const daysInMonth = daysForMonth(query.yearMonth);
  const elapsed = elapsedDays(query.yearMonth, daysInMonth);
  const totalLimitAmount = selected ? Number(selected.budget.totalLimitAmount) : null;
  const dailyAverageSpend = selected && elapsed > 0 ? spent / elapsed : selected ? 0 : null;
  const projectedMonthSpend = dailyAverageSpend === null ? null : dailyAverageSpend * daysInMonth;
  let status: MonthlyBudgetSummaryDto["status"] = "unset";
  if (selected) {
    status = totalLimitAmount !== null && spent > totalLimitAmount
      ? "over_budget"
      : totalLimitAmount !== null && totalLimitAmount > 0 && spent >= totalLimitAmount * 0.8
        ? "near_limit"
        : "on_track";
  }
  const limits = new Map((selected?.limits ?? []).map((limit) => [
    limit.categoryId,
    Number(limit.limitAmount),
  ]));
  const categoriesById = new Map(categoryResult.data.map((category) => [category.id, category]));
  const categoryBreakdown = makeCategoryBreakdown(spendResult.data.categoryRows, budgetCurrency, limits);
  for (const category of categoryResult.data) {
    if (!categoryBreakdown.some((entry) => entry.categoryId === category.id)) {
      categoryBreakdown.push({
        categoryId: category.id,
        slug: category.slug,
        label: category.label,
        i18nKey: category.i18nKey,
        iconName: category.iconName,
        colorToken: category.colorToken,
        spentAmount: 0,
        spentByCurrency: [],
        percentage: null,
        itemCount: 0,
        limitAmount: limits.get(category.id) ?? null,
      });
    }
  }
  categoryBreakdown.sort((left, right) =>
    (categoriesById.get(left.categoryId)?.sortOrder ?? 0) -
    (categoriesById.get(right.categoryId)?.sortOrder ?? 0) ||
    left.label.localeCompare(right.label));
  return ok({
    yearMonth: query.yearMonth,
    budget: selected ? {
      id: selected.budget.id,
      yearMonth: selected.budget.yearMonth,
      currency: selected.budget.currency,
      totalLimitAmount: totalLimitAmount!,
    } : null,
    isInherited: Boolean(selected && selected.budget.yearMonth !== query.yearMonth),
    totalSpent: selected ? spent : null,
    spendByCurrency: amountsByCurrency(spendResult.data.categoryRows),
    receiptCount: spendResult.data.receiptCount,
    itemCount: spendResult.data.itemCount,
    dailyAverageSpend,
    projectedMonthSpend,
    remainingAmount: totalLimitAmount === null ? null : totalLimitAmount - spent,
    status,
    pacing: { elapsedDays: elapsed, daysInMonth, nearLimitPercent: 80 },
    categoryBreakdown,
    merchantBreakdown: makeMerchantBreakdown(spendResult.data.merchantRows, budgetCurrency),
  });
}

export async function upsertMonthlyBudget(
  userId: string,
  yearMonth: string,
  input: UpsertMonthlyBudgetInput,
): Promise<Result<{ id: string; yearMonth: string }, AppError>> {
  const accessible = await categoriesService.assertCategoriesAccessible(
    userId,
    input.categoryLimits.map((limit) => limit.categoryId),
  );
  if (!accessible.success) return err(accessible.error);
  const saved = await upsertBudget(userId, yearMonth, input);
  return saved.success ? ok({ id: saved.data.id, yearMonth: saved.data.yearMonth }) : err(saved.error);
}
