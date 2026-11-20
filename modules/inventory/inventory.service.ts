import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { numericToNumber } from "../shared/numeric";
import { getById as getIngredientById } from "../ingredients/ingredients.service";
import { getById as getRecipeById } from "../recipes/recipes.service";
import {
  adjustInventoryRow,
  consumeInventoryRow,
  deleteInventoryItemRow,
  discardInventoryRow,
  findExpiringRows,
  findInventoryItem,
  getInventoryRows,
  insertInventoryItem,
  listInventoryRows,
  updateInventoryItemRow,
} from "./inventory.repo";
import type {
  ConsumeInventoryInput,
  CreateInventoryItemInput,
  InventoryItemDto,
  ListInventoryQuery,
  UpdateInventoryItemInput,
} from "./inventory.schema";
import type { MealLogDto } from "../meal-logs/meal-logs.schema";

type InventoryRow = NonNullable<Awaited<ReturnType<typeof findInventoryItem>>>;
type ConsumedRows = Extract<
  Awaited<ReturnType<typeof consumeInventoryRow>>,
  { kind: "consumed" }
>;

export function toInventoryItemDto(row: InventoryRow): InventoryItemDto {
  return {
    ...row,
    initialQuantity: Number(row.initialQuantity),
    remainingQuantity: Number(row.remainingQuantity),
    caloriesPerUnit: numericToNumber(row.caloriesPerUnit),
    proteinPerUnit: numericToNumber(row.proteinPerUnit),
    carbsPerUnit: numericToNumber(row.carbsPerUnit),
    fatPerUnit: numericToNumber(row.fatPerUnit),
    costPerUnit: numericToNumber(row.costPerUnit),
    preparedAt: row.preparedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
  return ok((await listInventoryRows(userId, filters)).map(toInventoryItemDto));
}

export async function getById(userId: string, id: string): Promise<Result<InventoryItemDto, AppError>> {
  const row = await findInventoryItem(userId, id);
  return row ? ok(toInventoryItemDto(row)) : err(notFound());
}

export async function create(
  userId: string,
  input: CreateInventoryItemInput,
): Promise<Result<InventoryItemDto, AppError>> {
  const validationError = await validateOwnership(userId, input);
  if (validationError) return err(validationError);
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  const row = await insertInventoryItem(userId, input);
  return row ? ok(toInventoryItemDto(row)) : err({ code: "INTERNAL_ERROR", message: "Item was not created." });
}

export async function update(
  userId: string,
  id: string,
  input: UpdateInventoryItemInput,
): Promise<Result<InventoryItemDto, AppError>> {
  const validationError = await validateOwnership(userId, input);
  if (validationError) return err(validationError);
  const row = await updateInventoryItemRow(userId, id, input);
  return row ? ok(toInventoryItemDto(row)) : err(notFound());
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
  return ok((await findExpiringRows(userId, withinHours)).map(toInventoryItemDto));
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
  if (result.kind === "insufficient") {
    return err({ code: "INSUFFICIENT_QUANTITY", message: "Item is not in stock or does not have enough quantity." });
  }
  return ok({ updatedItem: toInventoryItemDto(result.item), mealLog: toMealLogDto(result.mealLog) });
}

export async function discardItem(userId: string, id: string): Promise<Result<InventoryItemDto, AppError>> {
  const row = await discardInventoryRow(userId, id);
  return row ? ok(toInventoryItemDto(row)) : err(notFound());
}
