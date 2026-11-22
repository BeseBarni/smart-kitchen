import { and, eq, inArray } from "drizzle-orm";
import { db, ingredients, inventoryItems, receiptItems, receipts } from "@app/db";
import { err, ok, type AppError, type Result } from "@app/shared";
import type { BudgetTransaction } from "./budget.transaction";
import type { ReceiptItemInput } from "./receipts.schema";
import { moneyToNumeric } from "./money.utils";

class RollbackResult extends Error {
  constructor(readonly result: { success: false; error: AppError }) {
    super(result.error.message);
  }
}

export async function withReceiptTransaction<T>(
  userId: string,
  operation: (userId: string, tx: BudgetTransaction) => Promise<Result<T, AppError>>,
): Promise<Result<T, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const result = await operation(userId, tx);
      if (!result.success) throw new RollbackResult(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RollbackResult) return err(error.result.error);
    throw error;
  }
}

export async function insertReceiptRow(
  userId: string,
  tx: BudgetTransaction,
  values: {
    merchantId: string | null;
    mediaAssetId: string | null;
    source: "scanned" | "manual";
    title: string | null;
    purchasedAt: Date;
    currency: string;
    notes: string | null;
  },
): Promise<Result<typeof receipts.$inferSelect, AppError>> {
  const [row] = await tx.insert(receipts).values({ userId, ...values }).returning();
  return row
    ? ok(row)
    : err({ code: "INTERNAL_ERROR", message: "Receipt insert returned no row." });
}

export async function replaceReceiptItems(
  userId: string,
  tx: BudgetTransaction,
  receiptId: string,
  items: ReceiptItemInput[],
): Promise<Result<true, AppError>> {
  const [receipt] = await tx.select({ id: receipts.id }).from(receipts).where(and(
    eq(receipts.id, receiptId),
    eq(receipts.userId, userId),
  )).limit(1);
  if (!receipt) return err({ code: "ITEM_NOT_FOUND", message: "Receipt not found." });
  await tx.delete(receiptItems).where(eq(receiptItems.receiptId, receiptId));
  await tx.insert(receiptItems).values(items.map((item, sortOrder) => ({
    receiptId,
    categoryId: item.categoryId,
    name: item.name,
    rawReceiptText: item.rawReceiptText ?? null,
    quantity: String(item.quantity ?? 1),
    unit: item.unit ?? null,
    amount: moneyToNumeric(item.amount),
    inventoryItemId: item.inventoryItemId ?? null,
    ingredientId: item.ingredientId ?? null,
    sortOrder,
  })));
  return ok(true);
}

export async function updateReceiptRow(
  userId: string,
  tx: BudgetTransaction,
  id: string,
  values: Partial<Pick<typeof receipts.$inferInsert,
    "merchantId" | "mediaAssetId" | "source" | "title" | "purchasedAt" | "currency" | "notes">>,
): Promise<Result<typeof receipts.$inferSelect | undefined, AppError>> {
  const [row] = await tx.update(receipts).set({ ...values, updatedAt: new Date() })
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId))).returning();
  return ok(row);
}

export async function removeReceiptRow(
  userId: string,
  tx: BudgetTransaction,
  id: string,
): Promise<Result<boolean, AppError>> {
  const rows = await tx.delete(receipts).where(and(
    eq(receipts.id, id),
    eq(receipts.userId, userId),
  )).returning({ id: receipts.id });
  return ok(rows.length > 0);
}

export async function assertLinkedRecordsOwned(
  userId: string,
  inventoryItemIds: string[],
  ingredientIds: string[],
): Promise<Result<true, AppError>> {
  const uniqueInventoryIds = [...new Set(inventoryItemIds)];
  const uniqueIngredientIds = [...new Set(ingredientIds)];
  const [inventoryRows, ingredientRows] = await Promise.all([
    uniqueInventoryIds.length === 0 ? [] : db.select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), inArray(inventoryItems.id, uniqueInventoryIds))),
    uniqueIngredientIds.length === 0 ? [] : db.select({ id: ingredients.id })
      .from(ingredients)
      .where(and(eq(ingredients.userId, userId), inArray(ingredients.id, uniqueIngredientIds))),
  ]);
  if (
    inventoryRows.length !== uniqueInventoryIds.length ||
    ingredientRows.length !== uniqueIngredientIds.length
  ) {
    return err({ code: "VALIDATION_ERROR", message: "A linked inventory item or ingredient is not accessible." });
  }
  return ok(true);
}
