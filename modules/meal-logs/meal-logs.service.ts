import { err, ok, type AppError, type Result } from "@app/shared";
import { ensureAuthUser } from "../shared/user.repo";
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
  await ensureAuthUser(userId);
  const row = await insertMealLog(userId, input);
  return row
    ? ok(toDto(row))
    : err({ code: "INTERNAL_ERROR", message: "Meal log was not created." });
}

export async function getDailySummary(
  userId: string,
  input: { date: string },
): Promise<Result<{
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  costAmount: number;
  mealCount: number;
}, AppError>> {
  const rows = await getDailyMealLogRows(userId, input.date);
  const total = (field: "calories" | "proteinG" | "carbsG" | "fatG" | "costAmount"): number =>
    rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
  return ok({
    date: input.date,
    calories: total("calories"),
    proteinG: total("proteinG"),
    carbsG: total("carbsG"),
    fatG: total("fatG"),
    costAmount: total("costAmount"),
    mealCount: rows.length,
  });
}

export async function remove(
  userId: string,
  id: string,
  restoreInventory = false,
): Promise<Result<{ deleted: true }, AppError>> {
  return (await deleteMealLogRow(userId, id, restoreInventory))
    ? ok({ deleted: true })
    : err({ code: "ITEM_NOT_FOUND", message: "Meal log not found." });
}
