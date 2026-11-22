import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db, expenseCategories, merchants, receiptItems, receipts } from "@app/db";
import { ok, type AppError, type Result } from "@app/shared";

export type CategorySpendRow = {
  categoryId: string;
  slug: string;
  label: string;
  i18nKey: string | null;
  iconName: string | null;
  colorToken: string | null;
  currency: string;
  spentAmount: string;
  itemCount: number;
};
export type MerchantSpendRow = {
  merchantId: string;
  name: string;
  currency: string;
  spentAmount: string;
  receiptCount: number;
};
export type SpendAggregates = {
  categoryRows: CategorySpendRow[];
  merchantRows: MerchantSpendRow[];
  receiptCount: number;
  itemCount: number;
};

export async function getSpendAggregates(
  userId: string,
  from: Date,
  to: Date,
): Promise<Result<SpendAggregates, AppError>> {
  const period = and(
    eq(receipts.userId, userId),
    gte(receipts.purchasedAt, from),
    lt(receipts.purchasedAt, to),
  );
  const categoryRows = await db.select({
    categoryId: expenseCategories.id,
    slug: expenseCategories.slug,
    label: expenseCategories.label,
    i18nKey: expenseCategories.i18nKey,
    iconName: expenseCategories.iconName,
    colorToken: expenseCategories.colorToken,
    currency: receipts.currency,
    spentAmount: sql<string>`coalesce(sum(${receiptItems.amount}), 0)::text`,
    itemCount: sql<number>`count(${receiptItems.id})::int`,
  }).from(receiptItems)
    .innerJoin(receipts, and(eq(receipts.id, receiptItems.receiptId), period))
    .innerJoin(expenseCategories, eq(expenseCategories.id, receiptItems.categoryId))
    .where(sql`(${expenseCategories.userId} is null or ${expenseCategories.userId} = ${userId})`)
    .groupBy(
      expenseCategories.id,
      expenseCategories.slug,
      expenseCategories.label,
      expenseCategories.i18nKey,
      expenseCategories.iconName,
      expenseCategories.colorToken,
      receipts.currency,
    );
  const merchantRows = await db.select({
    merchantId: merchants.id,
    name: merchants.name,
    currency: receipts.currency,
    spentAmount: sql<string>`coalesce(sum(${receiptItems.amount}), 0)::text`,
    receiptCount: sql<number>`count(distinct ${receipts.id})::int`,
  }).from(receiptItems)
    .innerJoin(receipts, and(eq(receipts.id, receiptItems.receiptId), period))
    .innerJoin(merchants, and(
      eq(merchants.id, receipts.merchantId),
      eq(merchants.userId, userId),
    ))
    .where(isNotNull(receipts.merchantId))
    .groupBy(merchants.id, merchants.name, receipts.currency);
  const [totals] = await db.select({
    receiptCount: sql<number>`count(distinct ${receipts.id})::int`,
    itemCount: sql<number>`count(${receiptItems.id})::int`,
  }).from(receiptItems)
    .innerJoin(receipts, and(eq(receipts.id, receiptItems.receiptId), period));
  return ok({
    categoryRows,
    merchantRows,
    receiptCount: totals?.receiptCount ?? 0,
    itemCount: totals?.itemCount ?? 0,
  });
}
