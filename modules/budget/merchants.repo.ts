import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db, merchants, receipts } from "@app/db";
import { err, ok, type AppError, type Result } from "@app/shared";
import type { ListMerchantsQuery } from "./merchants.schema";
import type { BudgetTransaction } from "./budget.transaction";

export type MerchantRow = typeof merchants.$inferSelect;
export type MerchantWithStats = MerchantRow & {
  receiptCount: number;
  lastPurchasedAt: Date | null;
};

function uniqueNameConflict(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    (("constraint" in error && error.constraint === "merchants_user_normalized_name_uidx") ||
      ("constraint_name" in error && error.constraint_name === "merchants_user_normalized_name_uidx"));
}

export async function listWithStats(
  userId: string,
  query: ListMerchantsQuery,
): Promise<Result<MerchantWithStats[], AppError>> {
  const conditions = [eq(merchants.userId, userId)];
  if (query.q) conditions.push(ilike(merchants.name, `%${query.q}%`));
  const receiptCount = sql<number>`count(${receipts.id})::int`.as("receipt_count");
  const lastPurchasedAt = sql<Date | null>`max(${receipts.purchasedAt})`.as("last_purchased_at");
  const rows = await db.select({
    id: merchants.id,
    userId: merchants.userId,
    name: merchants.name,
    normalizedName: merchants.normalizedName,
    defaultCategoryId: merchants.defaultCategoryId,
    createdAt: merchants.createdAt,
    updatedAt: merchants.updatedAt,
    receiptCount,
    lastPurchasedAt,
  }).from(merchants).leftJoin(receipts, and(
    eq(receipts.merchantId, merchants.id),
    eq(receipts.userId, userId),
  )).where(and(...conditions)).groupBy(merchants.id).orderBy(
    ...(query.sort === "name"
      ? [asc(merchants.name), asc(merchants.id)]
      : [
        desc(receiptCount),
        sql`max(${receipts.purchasedAt}) desc nulls last`,
        asc(merchants.name),
      ]),
  ).limit(query.limit);
  return ok(rows);
}

export async function findById(
  userId: string,
  id: string,
  tx?: BudgetTransaction,
): Promise<Result<MerchantRow | undefined, AppError>> {
  const executor = tx ?? db;
  const [row] = await executor.select().from(merchants).where(and(
    eq(merchants.id, id),
    eq(merchants.userId, userId),
  )).limit(1);
  return ok(row);
}

export async function findByNormalizedName(
  userId: string,
  normalizedName: string,
): Promise<Result<MerchantRow | undefined, AppError>> {
  const [row] = await db.select().from(merchants).where(and(
    eq(merchants.userId, userId),
    eq(merchants.normalizedName, normalizedName),
  )).limit(1);
  return ok(row);
}

export async function findOrCreateByName(
  userId: string,
  name: string,
  normalizedName: string,
  defaultCategoryId: string | null,
  tx?: BudgetTransaction,
): Promise<Result<MerchantRow, AppError>> {
  const executor = tx ?? db;
  const [created] = await executor.insert(merchants).values({
    userId,
    name,
    normalizedName,
    defaultCategoryId,
  }).onConflictDoNothing({
    target: [merchants.userId, merchants.normalizedName],
  }).returning();
  if (created) return ok(created);
  const [existing] = await executor.select().from(merchants).where(and(
    eq(merchants.userId, userId),
    eq(merchants.normalizedName, normalizedName),
  )).limit(1);
  return existing
    ? ok(existing)
    : err({ code: "INTERNAL_ERROR", message: "Merchant resolution did not return a row." });
}

export async function insertMerchant(
  userId: string,
  name: string,
  normalizedName: string,
  defaultCategoryId: string | null,
): Promise<Result<MerchantRow, AppError>> {
  const [row] = await db.insert(merchants).values({
    userId,
    name,
    normalizedName,
    defaultCategoryId,
  }).onConflictDoNothing({
    target: [merchants.userId, merchants.normalizedName],
  }).returning();
  return row
    ? ok(row)
    : err({ code: "CONFLICT", message: "A merchant with this normalized name already exists." });
}

export async function updateMerchant(
  userId: string,
  id: string,
  values: Partial<Pick<MerchantRow, "name" | "normalizedName" | "defaultCategoryId">>,
): Promise<Result<MerchantRow | undefined, AppError>> {
  try {
    const [row] = await db.update(merchants).set({ ...values, updatedAt: new Date() })
      .where(and(eq(merchants.id, id), eq(merchants.userId, userId))).returning();
    return ok(row);
  } catch (error) {
    if (uniqueNameConflict(error)) {
      return err({ code: "CONFLICT", message: "A merchant with this normalized name already exists." });
    }
    throw error;
  }
}

export async function removeMerchant(
  userId: string,
  id: string,
): Promise<Result<boolean, AppError>> {
  const rows = await db.delete(merchants).where(and(
    eq(merchants.id, id),
    eq(merchants.userId, userId),
  )).returning({ id: merchants.id });
  return ok(rows.length > 0);
}

