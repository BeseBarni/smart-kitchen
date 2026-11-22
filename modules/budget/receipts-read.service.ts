import { err, ok, type AppError, type Result } from "@app/shared";
import * as mediaService from "../media/media.service";
import {
  findReceiptRow,
  listReceiptItems,
  listReceiptRows,
  type ReceiptItemWithCategory,
  type ReceiptWithMerchant,
} from "./receipts-read.repo";
import { sumNumericMoney } from "./money.utils";
import type {
  ListReceiptsQuery,
  ReceiptDetailDto,
  ReceiptItemDto,
  ReceiptSummaryDto,
} from "./receipts.schema";

function categoryDto(category: ReceiptItemWithCategory["category"]) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function merchantDto(row: ReceiptWithMerchant["merchant"]) {
  return row ? {
    id: row.id,
    userId: row.userId,
    name: row.name,
    defaultCategoryId: row.defaultCategoryId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } : null;
}

function itemDto(row: ReceiptItemWithCategory): ReceiptItemDto {
  const amount = Number(row.item.amount);
  const quantity = Number(row.item.quantity);
  return {
    id: row.item.id,
    receiptId: row.item.receiptId,
    name: row.item.name,
    rawReceiptText: row.item.rawReceiptText,
    category: categoryDto(row.category),
    quantity,
    unit: row.item.unit,
    amount,
    unitPrice: amount / quantity,
    inventoryItemId: row.item.inventoryItemId,
    ingredientId: row.item.ingredientId,
    sortOrder: row.item.sortOrder,
  };
}

function summaryDto(
  row: ReceiptWithMerchant,
  items: ReceiptItemWithCategory[],
): ReceiptSummaryDto {
  const byCategory = new Map<string, { category: ReceiptItemWithCategory["category"]; amounts: string[]; count: number }>();
  for (const item of items) {
    const bucket = byCategory.get(item.category.id) ?? {
      category: item.category,
      amounts: [],
      count: 0,
    };
    bucket.amounts.push(item.item.amount);
    bucket.count += 1;
    byCategory.set(item.category.id, bucket);
  }
  return {
    id: row.receipt.id,
    userId: row.receipt.userId,
    merchant: merchantDto(row.merchant),
    source: row.receipt.source,
    title: row.receipt.title,
    purchasedAt: row.receipt.purchasedAt.toISOString(),
    currency: row.receipt.currency,
    totalAmount: sumNumericMoney(items.map((item) => item.item.amount)),
    itemCount: items.length,
    categorySummary: [...byCategory.values()].map((bucket) => ({
      category: categoryDto(bucket.category),
      amount: sumNumericMoney(bucket.amounts),
      itemCount: bucket.count,
    })),
    createdAt: row.receipt.createdAt.toISOString(),
    updatedAt: row.receipt.updatedAt.toISOString(),
  };
}

function groupItems(rows: ReceiptItemWithCategory[]): Map<string, ReceiptItemWithCategory[]> {
  const groups = new Map<string, ReceiptItemWithCategory[]>();
  for (const row of rows) {
    const current = groups.get(row.item.receiptId) ?? [];
    current.push(row);
    groups.set(row.item.receiptId, current);
  }
  return groups;
}

export async function list(
  userId: string,
  query: ListReceiptsQuery,
): Promise<Result<ReceiptSummaryDto[], AppError>> {
  const rows = await listReceiptRows(userId, query);
  if (!rows.success) return err(rows.error);
  const items = await listReceiptItems(userId, rows.data.map((row) => row.receipt.id));
  if (!items.success) return err(items.error);
  const grouped = groupItems(items.data);
  return ok(rows.data.map((row) => summaryDto(row, grouped.get(row.receipt.id) ?? [])));
}

export async function getReceiptDetail(
  userId: string,
  id: string,
): Promise<Result<ReceiptDetailDto, AppError>> {
  const row = await findReceiptRow(userId, id);
  if (!row.success) return err(row.error);
  if (!row.data) return err({ code: "ITEM_NOT_FOUND", message: "Receipt not found." });
  const items = await listReceiptItems(userId, [id]);
  if (!items.success) return err(items.error);
  const summary = summaryDto(row.data, items.data);
  let mediaUrl: string | null = null;
  if (row.data.receipt.mediaAssetId) {
    const resolved = await mediaService.resolveReadableUrl(row.data.receipt.mediaAssetId, userId);
    if (!resolved.success) return err(resolved.error);
    mediaUrl = resolved.data;
  }
  return ok({
    ...summary,
    mediaAssetId: row.data.receipt.mediaAssetId,
    mediaUrl,
    notes: row.data.receipt.notes,
    items: items.data.map(itemDto),
  });
}
