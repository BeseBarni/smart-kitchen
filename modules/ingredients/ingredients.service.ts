import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { numericToNumber } from "../shared/numeric";
import {
  deleteIngredientRow,
  findIngredient,
  findIngredientsByIds,
  findIngredientsByName,
  insertIngredient,
  listIngredientRows,
  updateIngredientRow,
} from "./ingredients.repo";
import type {
  CreateIngredientInput,
  IngredientDto,
  ListIngredientsQuery,
  UpdateIngredientInput,
} from "./ingredients.schema";
import { resolveOrCreateTags } from "../tags/tags.service";
import { replaceIngredientTags } from "../tags/tags.repo";
import { assertOwnedUploadedAssets, softDeleteAndPurge } from "../media/media.service";
import { resolveEntityImages, isSafeMealDbIngredientName, isSafeMealDbImageName } from "../mealdb/mealdb-image.utils";

function validateStockImage(
  kind: "themealdb_meal" | "themealdb_ingredient" | null | undefined,
  name: string | null | undefined,
): AppError | undefined {
  if ((kind == null) !== (name == null)) {
    return { code: "VALIDATION_ERROR", message: "Stock image kind and name must be set together." };
  }
  if (kind && name) {
    const safe = kind === "themealdb_ingredient"
      ? isSafeMealDbIngredientName(name)
      : isSafeMealDbImageName(name);
    if (!safe) return { code: "VALIDATION_ERROR", message: "Stock image name is invalid." };
  }
  return undefined;
}

function toDto(row: Awaited<ReturnType<typeof findIngredient>> & object): IngredientDto {
  return {
    ...row,
    imageUrls: resolveEntityImages(row),
    baseQuantity: Number(row.baseQuantity),
    calories: numericToNumber(row.calories),
    proteinG: numericToNumber(row.proteinG),
    carbsG: numericToNumber(row.carbsG),
    fatG: numericToNumber(row.fatG),
    fiberG: numericToNumber(row.fiberG),
    priceAmount: numericToNumber(row.priceAmount),
    priceQuantity: numericToNumber(row.priceQuantity),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    shelfLifeDays: row.shelfLifeDays ?? {},
    tags: [],
  };
}

function notFound(): AppError {
  return { code: "ITEM_NOT_FOUND", message: "Ingredient not found." };
}

export async function list(
  userId: string,
  filters: ListIngredientsQuery,
): Promise<Result<IngredientDto[], AppError>> {
  return ok((await listIngredientRows(userId, filters)).map(toDto));
}

export async function getById(userId: string, id: string): Promise<Result<IngredientDto, AppError>> {
  const row = await findIngredient(userId, id);
  return row ? ok(toDto(row)) : err(notFound());
}

export async function create(
  userId: string,
  input: CreateIngredientInput,
): Promise<Result<IngredientDto, AppError>> {
  const stockError = validateStockImage(input.stockImageKind, input.stockImageName);
  if (stockError) return err(stockError);
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  if (input.imageAssetId) {
    const media = await assertOwnedUploadedAssets(userId, [input.imageAssetId], "ingredient_photo");
    if (!media.success) return err(media.error);
  }
  const persistedInput: CreateIngredientInput = input.imageAssetId
    ? { ...input, imageUrl: `/api/media/${input.imageAssetId}/file` }
    : input;
  const row = await insertIngredient(userId, persistedInput);
  if (!row) return err({ code: "INTERNAL_ERROR", message: "Ingredient was not created." });
  if (input.tags) {
    const resolved = await resolveOrCreateTags(userId, input.tags);
    if (!resolved.success) return err(resolved.error);
    await replaceIngredientTags(row.id, resolved.data.map((tag) => tag.id));
  }
  return ok(toDto(row));
}

export async function update(
  userId: string,
  id: string,
  input: UpdateIngredientInput,
): Promise<Result<IngredientDto, AppError>> {
  const stockError = validateStockImage(input.stockImageKind, input.stockImageName);
  if (stockError) return err(stockError);
  const existing = await findIngredient(userId, id);
  if (!existing) return err(notFound());
  if (input.imageAssetId) {
    const media = await assertOwnedUploadedAssets(userId, [input.imageAssetId], "ingredient_photo");
    if (!media.success) return err(media.error);
  }
  const oldAssetId = existing.imageAssetId;
  const persistedInput: UpdateIngredientInput =
    input.imageAssetId !== undefined && input.imageAssetId !== oldAssetId
      ? input.imageAssetId
        ? { ...input, imageUrl: `/api/media/${input.imageAssetId}/file` }
        : { ...input, imageUrl: null }
      : input;
  const row = await updateIngredientRow(userId, id, persistedInput);
  if (!row) return err(notFound());
  if (input.tags !== undefined) {
    const resolved = await resolveOrCreateTags(userId, input.tags);
    if (!resolved.success) return err(resolved.error);
    await replaceIngredientTags(row.id, resolved.data.map((tag) => tag.id));
  }
  if (oldAssetId && input.imageAssetId !== undefined && input.imageAssetId !== oldAssetId) {
    await softDeleteAndPurge(userId, oldAssetId);
  }
  return ok(toDto(row));
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  const existing = await findIngredient(userId, id);
  if (!existing) return err(notFound());
  if (!(await deleteIngredientRow(userId, id))) return err(notFound());
  if (existing.imageAssetId) await softDeleteAndPurge(userId, existing.imageAssetId);
  return ok({ deleted: true });
}

export async function findByIds(
  userId: string,
  ids: string[],
): Promise<Result<IngredientDto[], AppError>> {
  return ok((await findIngredientsByIds(userId, ids)).map(toDto));
}

export async function searchByName(
  userId: string,
  query: string,
): Promise<Result<IngredientDto[], AppError>> {
  return ok((await findIngredientsByName(userId, query)).map(toDto));
}
