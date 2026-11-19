import { err, ok, type AppError, type Result } from "@app/shared";
import { ensureAuthUser } from "../shared/user.repo";
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

function toDto(row: Awaited<ReturnType<typeof findIngredient>> & object): IngredientDto {
  return {
    ...row,
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
  await ensureAuthUser(userId);
  const row = await insertIngredient(userId, input);
  return row ? ok(toDto(row)) : err({ code: "INTERNAL_ERROR", message: "Ingredient was not created." });
}

export async function update(
  userId: string,
  id: string,
  input: UpdateIngredientInput,
): Promise<Result<IngredientDto, AppError>> {
  const row = await updateIngredientRow(userId, id, input);
  return row ? ok(toDto(row)) : err(notFound());
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  return (await deleteIngredientRow(userId, id))
    ? ok({ deleted: true })
    : err(notFound());
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
