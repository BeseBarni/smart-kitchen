import { err, ok, type AppError, type Result } from "@app/shared";
import * as mediaService from "../media/media.service";
import * as categoriesService from "./expense-categories.service";
import * as merchantsService from "./merchants.service";
import { findById as findMerchantById } from "./merchants.repo";
import type { BudgetTransaction } from "./budget.transaction";
import {
  assertLinkedRecordsOwned,
  insertReceiptRow,
  removeReceiptRow,
  replaceReceiptItems,
  updateReceiptRow,
  withReceiptTransaction,
} from "./receipts-write.repo";
import { getReceiptDetail } from "./receipts-read.service";
import type { CreateReceiptInput, ReceiptDetailDto, UpdateReceiptInput } from "./receipts.schema";
import type {
  CommitScannedReceiptInput,
  CommitScannedReceiptResultDto,
  CommitScannedReceiptItem,
} from "./receipts.schema";
import { insertScannedInventoryRows, insertScannedReceiptItems } from "./receipts-write.repo";
import { resolveOrCreateTags } from "../tags/tags.service";
import { list } from "../inventory/inventory.service";

function notFound(): AppError {
  return { code: "ITEM_NOT_FOUND", message: "Receipt not found." };
}

async function validateItems(
  userId: string,
  items: CreateReceiptInput["items"],
): Promise<Result<true, AppError>> {
  const categories = await categoriesService.assertCategoriesAccessible(
    userId,
    items.map((item) => item.categoryId),
  );
  if (!categories.success) return err(categories.error);
  return assertLinkedRecordsOwned(
    userId,
    items.flatMap((item) => item.inventoryItemId ? [item.inventoryItemId] : []),
    items.flatMap((item) => item.ingredientId ? [item.ingredientId] : []),
  );
}

async function validateReceiptMedia(
  userId: string,
  mediaAssetId: string | null | undefined,
): Promise<Result<true, AppError>> {
  if (!mediaAssetId) return ok(true);
  const assets = await mediaService.assertOwnedUploadedAssets(userId, [mediaAssetId]);
  if (!assets.success) return err(assets.error);
  if (assets.data.some((asset) => asset.purpose !== "receipt_scan" && asset.purpose !== "chat_attachment")) {
    return err({ code: "UNAUTHORIZED", message: "This media asset cannot be used as a receipt." });
  }
  return ok(true);
}

async function resolveMerchant(
  userId: string,
  merchantId: string | undefined,
  merchantName: string | undefined,
  tx: BudgetTransaction,
  defaultCategoryId?: string,
): Promise<Result<string | null, AppError>> {
  if (merchantName !== undefined) {
    const merchant = await merchantsService.findOrCreateByName(
      userId,
      merchantName,
      defaultCategoryId ? { defaultCategoryId } : {},
      tx,
    );
    return merchant.success ? ok(merchant.data.id) : err(merchant.error);
  }
  if (!merchantId) return ok(null);
  const merchant = await findMerchantById(userId, merchantId, tx);
  if (!merchant.success) return err(merchant.error);
  return merchant.data
    ? ok(merchant.data.id)
    : err({ code: "VALIDATION_ERROR", message: "Merchant is not accessible." });
}

export async function create(
  userId: string,
  input: CreateReceiptInput,
): Promise<Result<ReceiptDetailDto, AppError>> {
  const items = await validateItems(userId, input.items);
  if (!items.success) return err(items.error);
  const media = await validateReceiptMedia(userId, input.mediaAssetId);
  if (!media.success) return err(media.error);
  const created = await withReceiptTransaction(userId, async (ownerId, tx) => {
    const merchant = await resolveMerchant(ownerId, input.merchantId, input.merchantName, tx);
    if (!merchant.success) return err(merchant.error);
    const receipt = await insertReceiptRow(ownerId, tx, {
      merchantId: merchant.data,
      mediaAssetId: input.mediaAssetId ?? null,
      source: input.source,
      title: input.title ?? null,
      purchasedAt: new Date(input.purchasedAt),
      currency: input.currency,
      notes: input.notes ?? null,
    });
    if (!receipt.success) return err(receipt.error);
    const insertedItems = await replaceReceiptItems(ownerId, tx, receipt.data.id, input.items);
    return insertedItems.success ? ok(receipt.data.id) : err(insertedItems.error);
  });
  if (!created.success) return err(created.error);
  return getReceiptDetail(userId, created.data);
}

export async function update(
  userId: string,
  id: string,
  input: UpdateReceiptInput,
): Promise<Result<ReceiptDetailDto, AppError>> {
  if (input.items) {
    const items = await validateItems(userId, input.items);
    if (!items.success) return err(items.error);
  }
  if (input.mediaAssetId !== undefined) {
    const media = await validateReceiptMedia(userId, input.mediaAssetId);
    if (!media.success) return err(media.error);
  }
  const updated = await withReceiptTransaction(userId, async (ownerId, tx) => {
    const merchantId = input.merchantName !== undefined || input.merchantId !== undefined
      ? await resolveMerchant(ownerId, input.merchantId ?? undefined, input.merchantName, tx)
      : undefined;
    if (merchantId && !merchantId.success) return err(merchantId.error);
    const values: Parameters<typeof updateReceiptRow>[3] = {};
    if (merchantId) values.merchantId = merchantId.data;
    if (input.source !== undefined) values.source = input.source;
    if (input.title !== undefined) values.title = input.title;
    if (input.purchasedAt !== undefined) values.purchasedAt = new Date(input.purchasedAt);
    if (input.currency !== undefined) values.currency = input.currency;
    if (input.notes !== undefined) values.notes = input.notes;
    if (input.mediaAssetId !== undefined) values.mediaAssetId = input.mediaAssetId;
    const row = await updateReceiptRow(ownerId, tx, id, values);
    if (!row.success) return err(row.error);
    if (!row.data) return err(notFound());
    if (input.items) {
      const replaced = await replaceReceiptItems(ownerId, tx, id, input.items);
      if (!replaced.success) return err(replaced.error);
    }
    return ok(true);
  });
  if (!updated.success) return err(updated.error);
  return getReceiptDetail(userId, id);
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  const result = await withReceiptTransaction(userId, async (ownerId, tx) => {
    const removed = await removeReceiptRow(ownerId, tx, id);
    if (!removed.success) return err(removed.error);
    return removed.data
      ? ok({ deleted: true as const })
      : err(notFound());
  });
  return result.success ? ok(result.data) : err(result.error);
}

export async function commitScannedReceipt(
  userId: string,
  input: CommitScannedReceiptInput,
): Promise<Result<CommitScannedReceiptResultDto, AppError>> {
  const categories = await categoriesService.assertCategoriesAccessible(
    userId,
    input.items.map((item) => item.categoryId),
  );
  if (!categories.success) return err(categories.error);
  if (input.mediaAssetId) {
    const media = await validateReceiptMedia(userId, input.mediaAssetId);
    if (!media.success) return err(media.error);
  }
  const firstItem = input.items[0];
  if (!firstItem) return err({ code: "VALIDATION_ERROR", message: "At least one receipt item is required." });
  const dominantCategoryId = input.items.reduce<{ id: string; amount: number }>(
    (dominant, item) => item.amount > dominant.amount
      ? { id: item.categoryId, amount: item.amount }
      : dominant,
    { id: firstItem.categoryId, amount: firstItem.amount },
  ).id;
  const resolvedItems: CommitScannedReceiptItem[] = [];
  for (const item of input.items) {
    if (!item.addToInventory) {
      resolvedItems.push(item);
      continue;
    }
    if (!item.storageLocation) {
      return err({ code: "VALIDATION_ERROR", message: "A stocked receipt item requires a storage location." });
    }
    if (item.tags?.length) {
      const tags = await resolveOrCreateTags(userId, item.tags);
      if (!tags.success) return err(tags.error);
      resolvedItems.push({ ...item, tags: tags.data.map((tag) => ({ slug: tag.slug, label: tag.label })) });
    } else {
      resolvedItems.push(item);
    }
  }
  const created = await withReceiptTransaction(userId, async (ownerId, tx) => {
    const merchant = await resolveMerchant(
      ownerId,
      input.merchantId,
      input.merchantName,
      tx,
      dominantCategoryId,
    );
    if (!merchant.success) return err(merchant.error);
    const merchantId = merchant.data;
    const receipt = await insertReceiptRow(ownerId, tx, {
      merchantId,
      mediaAssetId: input.mediaAssetId ?? null,
      source: "scanned",
      title: input.title ?? null,
      purchasedAt: new Date(input.purchasedAt),
      currency: input.currency,
      notes: input.notes ?? null,
    });
    if (!receipt.success) return err(receipt.error);
    const inventory = await insertScannedInventoryRows(ownerId, tx, input.currency, resolvedItems);
    if (!inventory.success) return err(inventory.error);
    const items = await insertScannedReceiptItems(
      ownerId,
      tx,
      receipt.data.id,
      resolvedItems,
      inventory.data,
    );
    if (!items.success) return err(items.error);
    return ok({ receiptId: receipt.data.id, inventoryIds: inventory.data.map((entry) => entry.item.id) });
  });
  if (!created.success) return err(created.error);
  const receipt = await getReceiptDetail(userId, created.data.receiptId);
  if (!receipt.success) return err(receipt.error);
  const inventory = await list(userId, {
    storageLocation: undefined,
    status: "in_stock",
    search: undefined,
    sortBy: "createdAt",
    limit: 100,
    offset: 0,
  });
  if (!inventory.success) return err(inventory.error);
  const idSet = new Set(created.data.inventoryIds);
  return ok({
    receipt: receipt.data,
    createdInventoryItems: inventory.data.filter((item) => idSet.has(item.id)),
  });
}
