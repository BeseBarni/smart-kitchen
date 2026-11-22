import { and, eq, inArray } from "drizzle-orm";
import { db, ingredients, inventoryItems, inventoryItemTags, receiptItems, receipts, tags } from "@app/db";
import { err, ok, type AppError, type Result } from "@app/shared";
import type { BudgetTransaction } from "./budget.transaction";
import type { ReceiptItemInput } from "./receipts.schema";
import { moneyToNumeric } from "./money.utils";
import { numberToNumeric } from "../shared/numeric";
import type { CommitScannedReceiptItem } from "./receipts.schema";

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

export async function insertScannedInventoryRows(
  userId: string,
  tx: BudgetTransaction,
  currency: string,
  items: CommitScannedReceiptItem[],
): Promise<Result<Array<{ item: typeof inventoryItems.$inferSelect; index: number }>, AppError>> {
  const created: Array<{ item: typeof inventoryItems.$inferSelect; index: number }> = [];
  for (const [index, item] of items.entries()) {
    if (!item.addToInventory) continue;
    if (!item.storageLocation) {
      return err({ code: "VALIDATION_ERROR", message: "A stocked receipt item requires a storage location." });
    }
    const quantity = item.quantity;
    const expiresAt = item.expiresAt
      ? new Date(item.expiresAt)
      : item.shelfLifeDays?.[item.storageLocation]
        ? new Date(Date.now() + item.shelfLifeDays[item.storageLocation]! * 24 * 60 * 60 * 1000)
        : null;
    const [row] = await tx.insert(inventoryItems).values({
      userId,
      name: item.name,
      itemType: "ingredient",
      recipeId: null,
      ingredientId: null,
      storageLocation: item.storageLocation,
      status: "in_stock",
      initialQuantity: String(quantity),
      remainingQuantity: String(quantity),
      unit: item.unit ?? "piece",
      preparedAt: null,
      expiresAt,
      imageUrl: null,
      imageAssetId: null,
      stockImageKind: item.stockImageKind ?? null,
      stockImageName: item.stockImageName ?? null,
      caloriesPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.calories ?? null),
      proteinPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.proteinG ?? null),
      carbsPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.carbsG ?? null),
      fatPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.fatG ?? null),
      fiberPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.fiberG ?? null),
      costPerUnit: numberToNumeric(item.amount / quantity),
      currency,
      shelfLifeDays: item.shelfLifeDays ?? {},
    }).returning();
    if (!row) return err({ code: "INTERNAL_ERROR", message: "Inventory insert returned no row." });
    if (item.tags?.length) {
      const resolved = await tx.select({ id: tags.id }).from(tags).where(
        inArray(tags.slug, item.tags.map((tag) => tag.slug ?? tag.label)),
      );
      if (resolved.length) {
        await tx.insert(inventoryItemTags).values(resolved.slice(0, 3).map((tag) => ({
          inventoryItemId: row.id,
          tagId: tag.id,
        })));
      }
    }
    created.push({ item: row, index });
  }
  return ok(created);
}

export async function insertScannedReceiptItems(
  userId: string,
  tx: BudgetTransaction,
  receiptId: string,
  items: CommitScannedReceiptItem[],
  inventoryIndexes: Array<{ item: typeof inventoryItems.$inferSelect; index: number }>,
): Promise<Result<true, AppError>> {
  const [receipt] = await tx.select({ id: receipts.id }).from(receipts).where(and(
    eq(receipts.id, receiptId),
    eq(receipts.userId, userId),
  )).limit(1);
  if (!receipt) return err({ code: "ITEM_NOT_FOUND", message: "Receipt not found." });
  const inventoryByIndex = new Map(inventoryIndexes.map((entry) => [entry.index, entry.item.id]));
  await tx.insert(receiptItems).values(items.map((item, sortOrder) => ({
    receiptId,
    categoryId: item.categoryId,
    name: item.name,
    rawReceiptText: item.rawReceiptText ?? null,
    quantity: String(item.quantity),
    unit: item.unit ?? null,
    amount: moneyToNumeric(item.amount),
    inventoryItemId: inventoryByIndex.get(sortOrder) ?? null,
    ingredientId: null,
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
