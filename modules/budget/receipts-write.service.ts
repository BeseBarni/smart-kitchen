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
  const assets = await mediaService.assertOwnedUploadedAssets(userId, [mediaAssetId], "receipt_scan");
  return assets.success ? ok(true) : err(assets.error);
}

async function resolveMerchant(
  userId: string,
  merchantId: string | undefined,
  merchantName: string | undefined,
  tx: BudgetTransaction,
): Promise<Result<string | null, AppError>> {
  if (merchantName !== undefined) {
    const merchant = await merchantsService.findOrCreateByName(userId, merchantName, {}, tx);
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
