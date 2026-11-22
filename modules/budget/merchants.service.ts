import { err, ok, type AppError, type Result } from "@app/shared";
import * as categoriesService from "./expense-categories.service";
import type { BudgetTransaction } from "./budget.transaction";
import { normalizeMerchantName } from "./merchant-normalize.utils";
import {
  findById,
  findByNormalizedName,
  findOrCreateByName as findOrCreateRow,
  insertMerchant,
  listWithStats,
  removeMerchant,
  updateMerchant,
  type MerchantRow,
  type MerchantWithStats,
} from "./merchants.repo";
import type {
  CreateMerchantInput,
  ListMerchantsQuery,
  MerchantDto,
  UpdateMerchantInput,
} from "./merchants.schema";

function toDto(row: MerchantWithStats | MerchantRow): MerchantDto {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    defaultCategoryId: row.defaultCategoryId,
    receiptCount: "receiptCount" in row ? row.receiptCount : 0,
    lastPurchasedAt: "lastPurchasedAt" in row ? row.lastPurchasedAt?.toISOString() ?? null : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validateDefaultCategory(
  userId: string,
  categoryId: string | null | undefined,
  tx?: BudgetTransaction,
): Promise<Result<true, AppError>> {
  if (!categoryId) return ok(true);
  return categoriesService.assertCategoriesAccessible(userId, [categoryId], tx);
}

export async function list(
  userId: string,
  query: ListMerchantsQuery,
): Promise<Result<MerchantDto[], AppError>> {
  const rows = await listWithStats(userId, query);
  return rows.success ? ok(rows.data.map(toDto)) : err(rows.error);
}

export async function findOrCreateByName(
  userId: string,
  name: string,
  options: { defaultCategoryId?: string | null } = {},
  tx?: BudgetTransaction,
): Promise<Result<MerchantRow, AppError>> {
  const displayName = name.trim().replace(/\s+/g, " ");
  const normalizedName = normalizeMerchantName(displayName);
  if (!displayName || !normalizedName) {
    return err({ code: "VALIDATION_ERROR", message: "Merchant name must not be empty." });
  }
  const category = await validateDefaultCategory(userId, options.defaultCategoryId, tx);
  if (!category.success) return err(category.error);
  return findOrCreateRow(userId, displayName, normalizedName, options.defaultCategoryId ?? null, tx);
}

export async function create(
  userId: string,
  input: CreateMerchantInput,
): Promise<Result<MerchantDto, AppError>> {
  const category = await validateDefaultCategory(userId, input.defaultCategoryId);
  if (!category.success) return err(category.error);
  const name = input.name.replace(/\s+/g, " ");
  const normalizedName = normalizeMerchantName(name);
  const existing = await findByNormalizedName(userId, normalizedName);
  if (!existing.success) return err(existing.error);
  if (existing.data) {
    return err({ code: "CONFLICT", message: "A merchant with this normalized name already exists." });
  }
  const created = await insertMerchant(userId, name, normalizedName, input.defaultCategoryId ?? null);
  return created.success ? ok(toDto(created.data)) : err(created.error);
}

export async function update(
  userId: string,
  id: string,
  input: UpdateMerchantInput,
): Promise<Result<MerchantDto, AppError>> {
  const existing = await findById(userId, id);
  if (!existing.success) return err(existing.error);
  if (!existing.data) return err({ code: "ITEM_NOT_FOUND", message: "Merchant not found." });
  const category = await validateDefaultCategory(userId, input.defaultCategoryId);
  if (!category.success) return err(category.error);
  const values: Partial<Pick<MerchantRow, "name" | "normalizedName" | "defaultCategoryId">> = {};
  if (input.name !== undefined) {
    const name = input.name.replace(/\s+/g, " ");
    const normalizedName = normalizeMerchantName(name);
    const duplicate = await findByNormalizedName(userId, normalizedName);
    if (!duplicate.success) return err(duplicate.error);
    if (duplicate.data && duplicate.data.id !== id) {
      return err({ code: "CONFLICT", message: "A merchant with this normalized name already exists." });
    }
    values.name = name;
    values.normalizedName = normalizedName;
  }
  if (input.defaultCategoryId !== undefined) values.defaultCategoryId = input.defaultCategoryId;
  const updated = await updateMerchant(userId, id, values);
  if (!updated.success) return err(updated.error);
  return updated.data ? ok(toDto(updated.data)) : err({ code: "ITEM_NOT_FOUND", message: "Merchant not found." });
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  const removed = await removeMerchant(userId, id);
  if (!removed.success) return err(removed.error);
  return removed.data
    ? ok({ deleted: true })
    : err({ code: "ITEM_NOT_FOUND", message: "Merchant not found." });
}
