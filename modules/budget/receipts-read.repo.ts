import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, expenseCategories, merchants, receiptItems, receipts } from "@app/db";
import { ok, type AppError, type Result } from "@app/shared";
import type { ListReceiptsQuery } from "./receipts.schema";

export type ReceiptRow = typeof receipts.$inferSelect;
export type ReceiptItemRow = typeof receiptItems.$inferSelect;
export type ReceiptWithMerchant = {
  receipt: ReceiptRow;
  merchant: typeof merchants.$inferSelect | null;
};
export type ReceiptItemWithCategory = {
  item: ReceiptItemRow;
  category: typeof expenseCategories.$inferSelect;
};

function monthRange(yearMonth: string): { start: Date; end: Date } {
  const [yearText = "", monthText = "1"] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export async function listReceiptRows(
  userId: string,
  query: ListReceiptsQuery,
): Promise<Result<ReceiptWithMerchant[], AppError>> {
  const conditions = [eq(receipts.userId, userId)];
  if (query.from) conditions.push(gte(receipts.purchasedAt, new Date(query.from)));
  if (query.to) conditions.push(lt(receipts.purchasedAt, new Date(query.to)));
  if (query.yearMonth) {
    const range = monthRange(query.yearMonth);
    conditions.push(gte(receipts.purchasedAt, range.start), lt(receipts.purchasedAt, range.end));
  }
  if (query.merchantId) conditions.push(eq(receipts.merchantId, query.merchantId));
  if (query.source) conditions.push(eq(receipts.source, query.source));
  if (query.categoryId) {
    conditions.push(sql`exists (
      select 1 from ${receiptItems} category_filter
      where category_filter.receipt_id = ${receipts.id}
        and category_filter.category_id = ${query.categoryId}
    )`);
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    conditions.push(or(
      ilike(receipts.title, pattern),
      ilike(merchants.name, pattern),
      sql`exists (
        select 1 from ${receiptItems} item_search
        where item_search.receipt_id = ${receipts.id}
          and item_search.name ilike ${pattern}
      )`,
    )!);
  }
  const rows = await db.select({ receipt: receipts, merchant: merchants })
    .from(receipts)
    .leftJoin(merchants, and(
      eq(merchants.id, receipts.merchantId),
      eq(merchants.userId, userId),
    ))
    .where(and(...conditions))
    .orderBy(desc(receipts.purchasedAt), desc(receipts.id))
    .limit(query.limit)
    .offset(query.offset);
  return ok(rows);
}

export async function findReceiptRow(
  userId: string,
  id: string,
): Promise<Result<ReceiptWithMerchant | undefined, AppError>> {
  const [row] = await db.select({ receipt: receipts, merchant: merchants })
    .from(receipts)
    .leftJoin(merchants, and(
      eq(merchants.id, receipts.merchantId),
      eq(merchants.userId, userId),
    ))
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
    .limit(1);
  return ok(row);
}

export async function listReceiptItems(
  userId: string,
  receiptIds: string[],
): Promise<Result<ReceiptItemWithCategory[], AppError>> {
  if (receiptIds.length === 0) return ok([]);
  const rows = await db.select({ item: receiptItems, category: expenseCategories })
    .from(receiptItems)
    .innerJoin(receipts, and(
      eq(receipts.id, receiptItems.receiptId),
      eq(receipts.userId, userId),
    ))
    .innerJoin(expenseCategories, eq(expenseCategories.id, receiptItems.categoryId))
    .where(and(
      inArray(receiptItems.receiptId, receiptIds),
      or(isNull(expenseCategories.userId), eq(expenseCategories.userId, userId)),
    ))
    .orderBy(asc(receiptItems.sortOrder), asc(receiptItems.id));
  return ok(rows);
}
