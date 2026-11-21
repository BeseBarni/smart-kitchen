import { err, estimatedExpiry, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { numericToNumber } from "../shared/numeric";
import { getById as getIngredientById } from "../ingredients/ingredients.service";
import { getById as getRecipeById } from "../recipes/recipes.service";
import {
  adjustInventoryRow,
  deleteInventoryItemRow,
  discardInventoryRow,
  findExpiringRows,
  findInventoryItem,
  getInventoryRows,
  insertInventoryItem,
  insertInventoryBatch,
  listInventoryRows,
  updateInventoryItemRow,
  findInventoryTags,
  findLinkedRecipe,
  replaceInventoryItemTags,
  updateStorageLocationRow,
} from "./inventory.repo";
import { consumeInventoryRow } from "./inventory-consumption.repo";
import type {
  BatchCreateInventoryInput,
  ConsumeInventoryInput,
  CreateInventoryItemInput,
  InventoryItemDto,
  ListInventoryQuery,
  UpdateInventoryItemInput,
  InventoryDetailDto,
  SwitchStorageLocationInput,
} from "./inventory.schema";
import type { MealLogDto } from "../meal-logs/meal-logs.schema";
import { resolveOrCreateTags, MAX_ATTRIBUTE_CHIPS } from "../tags/tags.service";

type InventoryRow = NonNullable<Awaited<ReturnType<typeof findInventoryItem>>>;
type ConsumedRows = Extract<
  Awaited<ReturnType<typeof consumeInventoryRow>>,
  { kind: "consumed" }
>;

export function toInventoryItemDto(
  row: InventoryRow,
  tags: InventoryItemDto["tags"] = [],
): InventoryItemDto {
  return {
    ...row,
    initialQuantity: Number(row.initialQuantity),
    remainingQuantity: Number(row.remainingQuantity),
    caloriesPerUnit: numericToNumber(row.caloriesPerUnit),
    proteinPerUnit: numericToNumber(row.proteinPerUnit),
    carbsPerUnit: numericToNumber(row.carbsPerUnit),
    fatPerUnit: numericToNumber(row.fatPerUnit),
    fiberPerUnit: numericToNumber(row.fiberPerUnit),
    costPerUnit: numericToNumber(row.costPerUnit),
    preparedAt: row.preparedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    shelfLifeDays: row.shelfLifeDays ?? {},
    tags,
  };
}

function toMealLogDto(row: ConsumedRows["mealLog"]): MealLogDto {
  return {
    ...row,
    quantity: Number(row.quantity),
    calories: numericToNumber(row.calories),
    proteinG: numericToNumber(row.proteinG),
    carbsG: numericToNumber(row.carbsG),
    fatG: numericToNumber(row.fatG),
    fiberG: numericToNumber(row.fiberG),
    costAmount: numericToNumber(row.costAmount),
    eatenAt: row.eatenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function notFound(): AppError {
  return { code: "ITEM_NOT_FOUND", message: "Inventory item not found." };
}

async function validateOwnership(
  userId: string,
  references: { recipeId?: string | null; ingredientId?: string | null },
): Promise<AppError | undefined> {
  if (references.recipeId) {
    const recipe = await getRecipeById(userId, references.recipeId);
    if (!recipe.success) return { code: "VALIDATION_ERROR", message: "Linked recipe was not found." };
  }
  if (references.ingredientId) {
    const ingredient = await getIngredientById(userId, references.ingredientId);
    if (!ingredient.success) return { code: "VALIDATION_ERROR", message: "Linked ingredient was not found." };
  }
  return undefined;
}

export async function list(
  userId: string,
  filters: ListInventoryQuery,
): Promise<Result<InventoryItemDto[], AppError>> {
  const rows = await listInventoryRows(userId, filters);
  const tagRows = await findInventoryTags(rows.map((row) => row.id));
  const byItem = new Map<string, InventoryItemDto["tags"]>();
  for (const tag of tagRows) {
    const current = byItem.get(tag.inventoryItemId) ?? [];
    current.push({
      id: tag.id,
      slug: tag.slug,
      label: tag.label,
      i18nKey: tag.i18nKey,
      category: tag.category,
      colorToken: tag.colorToken,
    });
    byItem.set(tag.inventoryItemId, current.slice(0, MAX_ATTRIBUTE_CHIPS));
  }
  return ok(rows.map((row) => toInventoryItemDto(row, byItem.get(row.id) ?? [])));
}

export async function getById(
  userId: string,
  id: string,
): Promise<Result<InventoryDetailDto, AppError>> {
  const row = await findInventoryItem(userId, id);
  if (!row) return err(notFound());
  const [tagRows, recipe] = await Promise.all([
    findInventoryTags([id]),
    findLinkedRecipe(userId, row.recipeId),
  ]);
  const tags = tagRows.map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    label: tag.label,
    i18nKey: tag.i18nKey,
    category: tag.category,
    colorToken: tag.colorToken,
  })).slice(0, MAX_ATTRIBUTE_CHIPS);
  const item = toInventoryItemDto(row, tags);
  const msRemaining = row.expiresAt ? row.expiresAt.getTime() - Date.now() : null;
  const daysRemaining = msRemaining === null
    ? null
    : msRemaining / (24 * 60 * 60 * 1000);
  return ok({
    ...item,
    freshness: {
      msRemaining,
      daysRemaining,
      isExpired: msRemaining !== null && msRemaining < 0,
      shelfLifeDaysForCurrentLocation: row.shelfLifeDays?.[row.storageLocation] ?? null,
    },
    recipe,
  });
}

export async function create(
  userId: string,
  input: CreateInventoryItemInput,
): Promise<Result<InventoryItemDto, AppError>> {
  const validationError = await validateOwnership(userId, input);
  if (validationError) return err(validationError);
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  const expiry = input.expiresAt ?? estimatedExpiry(
    input.shelfLifeDays, input.storageLocation, input.preparedAt ? new Date(input.preparedAt) : new Date(),
  )?.toISOString() ?? null;
  const row = await insertInventoryItem(userId, { ...input, expiresAt: expiry });
  if (!row) return err({ code: "INTERNAL_ERROR", message: "Item was not created." });
  const resolved = await resolveOrCreateTags(userId, input.tags ?? []);
  if (!resolved.success) return err(resolved.error);
  await replaceInventoryItemTags(row.id, resolved.data.map((tag) => tag.id));
  return ok(toInventoryItemDto(row, resolved.data));
}

export async function createBatch(
  userId: string,
  input: BatchCreateInventoryInput,
): Promise<Result<{ items: InventoryItemDto[] }, AppError>> {
  if (input.items.length === 0) {
    return err({ code: "VALIDATION_ERROR", message: "At least one inventory item is required." });
  }
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  try {
    const now = new Date();
    const rows = await insertInventoryBatch(userId, {
      items: input.items.map((item) => ({
        ...item,
        expiresAt: item.expiresAt ?? estimatedExpiry(item.shelfLifeDays, item.storageLocation, now)?.toISOString() ?? null,
      })),
    });
    const items: InventoryItemDto[] = [];
    for (const [index, row] of rows.entries()) {
      const resolved = await resolveOrCreateTags(userId, input.items[index]?.tags ?? []);
      if (!resolved.success) return err(resolved.error);
      await replaceInventoryItemTags(row.id, resolved.data.map((tag) => tag.id));
      items.push(toInventoryItemDto(row, resolved.data));
    }
    return ok({ items });
  } catch (error) {
    return err({
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Inventory batch could not be created.",
    });
  }
}

export async function update(
  userId: string,
  id: string,
  input: UpdateInventoryItemInput,
): Promise<Result<InventoryItemDto, AppError>> {
  const validationError = await validateOwnership(userId, input);
  if (validationError) return err(validationError);
  const row = await updateInventoryItemRow(userId, id, input);
  if (!row) return err(notFound());
  if (input.tags !== undefined) {
    const resolved = await resolveOrCreateTags(userId, input.tags);
    if (!resolved.success) return err(resolved.error);
    await replaceInventoryItemTags(row.id, resolved.data.map((tag) => tag.id));
    return ok(toInventoryItemDto(row, resolved.data));
  }
  const tagRows = await findInventoryTags([id]);
  const tags = tagRows.map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    label: tag.label,
    i18nKey: tag.i18nKey,
    category: tag.category,
    colorToken: tag.colorToken,
  })).slice(0, MAX_ATTRIBUTE_CHIPS);
  return ok(toInventoryItemDto(row, tags));
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  return (await deleteInventoryItemRow(userId, id))
    ? ok({ deleted: true })
    : err(notFound());
}

export async function listExpiring(
  userId: string,
  withinHours = 48,
): Promise<Result<InventoryItemDto[], AppError>> {
  if (!Number.isFinite(withinHours) || withinHours <= 0) {
    return err({ code: "VALIDATION_ERROR", message: "Expiry window must be positive." });
  }
  return ok((await findExpiringRows(userId, withinHours)).map((row) => toInventoryItemDto(row)));
}

export async function getSummary(userId: string): Promise<Result<{
  totalItems: number;
  totalQuantity: number;
  byLocation: Record<"fridge" | "freezer" | "pantry", { items: number; quantity: number }>;
  expiringSoonCount: number;
}, AppError>> {
  const [rows, expiring] = await Promise.all([
    getInventoryRows(userId),
    findExpiringRows(userId, 48),
  ]);
  const byLocation = {
    fridge: { items: 0, quantity: 0 },
    freezer: { items: 0, quantity: 0 },
    pantry: { items: 0, quantity: 0 },
  };
  let totalQuantity = 0;
  for (const row of rows) {
    const quantity = Number(row.remainingQuantity);
    totalQuantity += quantity;
    byLocation[row.storageLocation].items += 1;
    byLocation[row.storageLocation].quantity += quantity;
  }
  return ok({ totalItems: rows.length, totalQuantity, byLocation, expiringSoonCount: expiring.length });
}

export async function adjustQuantity(
  userId: string,
  id: string,
  delta: number,
): Promise<Result<InventoryItemDto, AppError>> {
  if (!Number.isFinite(delta) || delta === 0) {
    return err({ code: "VALIDATION_ERROR", message: "Quantity adjustment must be a non-zero number." });
  }
  const result = await adjustInventoryRow(userId, id, delta);
  if (result.kind === "not_found") return err(notFound());
  if (result.kind === "insufficient") {
    return err({ code: "INSUFFICIENT_QUANTITY", message: "Adjustment would make remaining quantity negative." });
  }
  return ok(toInventoryItemDto(result.item));
}

export async function consumePortion(
  userId: string,
  id: string,
  input: ConsumeInventoryInput,
): Promise<Result<{ updatedItem: InventoryItemDto; mealLog: MealLogDto }, AppError>> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return err({ code: "VALIDATION_ERROR", message: "Consumption quantity must be positive." });
  }
  const result = await consumeInventoryRow(userId, id, input);
  if (result.kind === "not_found") return err(notFound());
  if (result.kind === "missing_fiber") {
    return err({ code: "VALIDATION_ERROR", message: "Fiber is required for this meal." });
  }
  if (result.kind === "insufficient") {
    return err({ code: "INSUFFICIENT_QUANTITY", message: "Item is not in stock or does not have enough quantity." });
  }
  return ok({ updatedItem: toInventoryItemDto(result.item), mealLog: toMealLogDto(result.mealLog) });
}

export async function discardItem(userId: string, id: string): Promise<Result<InventoryItemDto, AppError>> {
  const row = await discardInventoryRow(userId, id);
  return row ? ok(toInventoryItemDto(row)) : err(notFound());
}

export async function switchStorageLocation(
  userId: string,
  id: string,
  input: SwitchStorageLocationInput,
): Promise<Result<InventoryDetailDto, AppError>> {
  const existing = await findInventoryItem(userId, id);
  if (!existing) return err(notFound());
  const shelfLife = existing.shelfLifeDays?.[input.storageLocation];
  let expiresAt = existing.expiresAt;
  if (input.recalculateExpiry) {
    const positive = typeof shelfLife === "number" && Number.isFinite(shelfLife) && shelfLife > 0;
    if (positive) {
      const days = existing.storageLocation === "freezer" && input.storageLocation === "fridge"
        ? Math.min(shelfLife, 4)
        : shelfLife;
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }
  const row = await updateStorageLocationRow(
    userId,
    id,
    input.storageLocation,
    expiresAt,
  );
  if (!row) return err(notFound());
  return getById(userId, id);
}
