import { err, ok, type AppError, type Result } from "@app/shared";
import { requireAuthUser } from "../shared/user.service";
import { numericToNumber } from "../shared/numeric";
import { getById as getRecipeById } from "../recipes/recipes.service";
import {
  deleteMealLogRow,
  getDailyMealLogRows,
  insertMealLog,
  listMealLogRows,
} from "./meal-logs.repo";
import type {
  CreateMealLogInput,
  ListMealLogsQuery,
  MealLogDto,
} from "./meal-logs.schema";

type MealLogRow = Awaited<ReturnType<typeof listMealLogRows>>[number];

function toDto(row: MealLogRow): MealLogDto {
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

export async function list(
  userId: string,
  filters: ListMealLogsQuery,
): Promise<Result<MealLogDto[], AppError>> {
  return ok((await listMealLogRows(userId, filters)).map(toDto));
}

export async function createManualLog(
  userId: string,
  input: CreateMealLogInput,
): Promise<Result<MealLogDto, AppError>> {
  if (input.inventoryItemId !== null) {
    return err({ code: "VALIDATION_ERROR", message: "Manual meal logs cannot reference tracked inventory." });
  }
  if (input.recipeId) {
    const recipe = await getRecipeById(userId, input.recipeId);
    if (!recipe.success) return err({ code: "VALIDATION_ERROR", message: "Linked recipe was not found." });
  }
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  const row = await insertMealLog(userId, input);
  return row
    ? ok(toDto(row))
    : err({ code: "INTERNAL_ERROR", message: "Meal log was not created." });
}

export async function getDailySummary(
  userId: string,
  input: { date: string; from?: string; to?: string },
): Promise<Result<{
  date: string;
  calories: number;
  unknownCaloriesCount: number;
  proteinG: number;
  unknownProteinCount: number;
  carbsG: number;
  unknownCarbsCount: number;
  fatG: number;
  unknownFatCount: number;
  fiberG: number;
  unknownFiberCount: number;
  costAmount: number;
  mealCount: number;
}, AppError>> {
  if ((input.from === undefined) !== (input.to === undefined)) {
    return err({ code: "VALIDATION_ERROR", message: "Provide both local-day bounds." });
  }
  if (input.from !== undefined && input.to !== undefined) {
    const duration = Date.parse(input.to) - Date.parse(input.from);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 48 * 60 * 60 * 1000) {
      return err({ code: "VALIDATION_ERROR", message: "Invalid local-day bounds." });
    }
  }
  const bounds = input.from !== undefined && input.to !== undefined
    ? { from: input.from, to: input.to }
    : undefined;
  const rows = await getDailyMealLogRows(userId, input.date, bounds);
  const total = (field: "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "costAmount"): number =>
    rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
  return ok({
    date: input.date,
    calories: total("calories"),
    unknownCaloriesCount: rows.filter((row) => row.calories === null).length,
    proteinG: total("proteinG"),
    unknownProteinCount: rows.filter((row) => row.proteinG === null).length,
    carbsG: total("carbsG"),
    unknownCarbsCount: rows.filter((row) => row.carbsG === null).length,
    fatG: total("fatG"),
    unknownFatCount: rows.filter((row) => row.fatG === null).length,
    fiberG: total("fiberG"),
    unknownFiberCount: rows.filter((row) => row.fiberG === null).length,
    costAmount: total("costAmount"),
    mealCount: rows.length,
  });
}

export async function remove(
  userId: string,
  id: string,
  restoreInventory = false,
  requireInventory = false,
): Promise<Result<{ deleted: true }, AppError>> {
  if (requireInventory && !restoreInventory) {
    return err({ code: "VALIDATION_ERROR", message: "Inventory restoration must be enabled." });
  }
  const result = await deleteMealLogRow(userId, id, restoreInventory, requireInventory);
  if (result === "missing_inventory") return err({ code: "CONFLICT", message: "The linked inventory item can no longer be restored." });
  if (result === "not_found") return err({ code: "ITEM_NOT_FOUND", message: "Meal log not found." });
  return ok({ deleted: true });
}
