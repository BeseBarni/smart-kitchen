import { err, ok, type AppError, type Result } from "@app/shared";
import { findByIds } from "../ingredients/ingredients.service";
import { requireAuthUser } from "../shared/user.service";
import {
  cookRecipeRows,
  deleteRecipeRow,
  findRecipe,
  insertRecipe,
  listRecipeRows,
  updateRecipeRows,
} from "./recipes.repo";
import type {
  CreateRecipeInput,
  ListRecipesQuery,
  RecipeDto,
  UpdateRecipeInput,
} from "./recipes.schema";
import {
  calculateRecipeValues,
  chooseComputedValue,
  cookedRowToDto,
  ingredientRowToDto,
  recipeDto,
  recipeListDto,
  withRecipeOverrides,
  type RecipeLineInput,
  type RecipeValues,
} from "./recipes.mapper";

async function loadLinked(userId: string, lines: RecipeLineInput[]) {
  const ids = [...new Set(lines.flatMap((line) => (line.ingredientId ? [line.ingredientId] : [])))];
  const result = await findByIds(userId, ids);
  if (!result.success) return result;
  if (result.data.length !== ids.length) {
    return err<AppError>({
      code: "VALIDATION_ERROR",
      message: "One or more linked ingredients were not found.",
    });
  }
  return ok(new Map(result.data.map((ingredient) => [ingredient.id, ingredient])));
}

export async function list(
  userId: string,
  filters: ListRecipesQuery,
): Promise<Result<RecipeDto[], AppError>> {
  return ok((await listRecipeRows(userId, filters)).map(recipeListDto));
}

export async function getById(userId: string, id: string): Promise<Result<RecipeDto, AppError>> {
  const result = await findRecipe(userId, id);
  return result
    ? ok(recipeDto(result.recipe, result.lines))
    : err({ code: "ITEM_NOT_FOUND", message: "Recipe not found." });
}

export async function create(
  userId: string,
  input: CreateRecipeInput,
): Promise<Result<RecipeDto, AppError>> {
  const linked = await loadLinked(userId, input.ingredients);
  if (!linked.success) return err(linked.error);
  const user = await requireAuthUser(userId);
  if (!user.success) return user;
  const computed = withRecipeOverrides(
    input,
    calculateRecipeValues(input.ingredients, linked.data, input.servings),
  );
  const id = await insertRecipe(userId, input, computed);
  if (!id) return err({ code: "INTERNAL_ERROR", message: "Recipe was not created." });
  return getById(userId, id);
}

export async function update(
  userId: string,
  id: string,
  input: UpdateRecipeInput,
): Promise<Result<RecipeDto, AppError>> {
  const existing = await findRecipe(userId, id);
  if (!existing) return err({ code: "ITEM_NOT_FOUND", message: "Recipe not found." });
  const lines: RecipeLineInput[] = input.ingredients ?? existing.lines.map(({ line }) => ({
    displayName: line.displayName,
    ingredientId: line.ingredientId,
    quantity: Number(line.quantity),
    unit: line.unit,
    notes: line.notes,
    sortOrder: line.sortOrder,
  }));
  const linked = input.ingredients === undefined
    ? ok(new Map(existing.lines.flatMap(({ ingredient }) => ingredient
      ? [[ingredient.id, ingredientRowToDto(ingredient)] as const]
      : [])))
    : await loadLinked(userId, lines);
  if (!linked.success) return err(linked.error);

  const servings = input.servings ?? Number(existing.recipe.servings);
  const derived = calculateRecipeValues(lines, linked.data, servings);
  const shouldRecompute = input.ingredients !== undefined || input.servings !== undefined;
  const computed: Partial<RecipeValues> = {
    caloriesPerServing: chooseComputedValue(
      input.caloriesPerServing,
      derived.caloriesPerServing,
      shouldRecompute,
    ),
    proteinPerServing: chooseComputedValue(
      input.proteinPerServing,
      derived.proteinPerServing,
      shouldRecompute,
    ),
    carbsPerServing: chooseComputedValue(
      input.carbsPerServing,
      derived.carbsPerServing,
      shouldRecompute,
    ),
    fatPerServing: chooseComputedValue(input.fatPerServing, derived.fatPerServing, shouldRecompute),
    costPerServing: chooseComputedValue(
      input.costPerServing,
      derived.costPerServing,
      shouldRecompute,
    ),
  };
  const updated = await updateRecipeRows(userId, id, input, computed);
  return updated ? getById(userId, id) : err({ code: "ITEM_NOT_FOUND", message: "Recipe not found." });
}

export async function remove(userId: string, id: string): Promise<Result<{ deleted: true }, AppError>> {
  return (await deleteRecipeRow(userId, id))
    ? ok({ deleted: true })
    : err({ code: "ITEM_NOT_FOUND", message: "Recipe not found." });
}

export async function cookAndStock(
  userId: string,
  recipeId: string,
  input: {
    batches: Array<{
      storageLocation: "fridge" | "freezer" | "pantry";
      quantity: number;
      unit?: string;
      expiresAt?: string;
    }>;
    preparedAt?: string;
  },
): Promise<Result<import("../inventory/inventory.schema").InventoryItemDto[], AppError>> {
  const rows = await cookRecipeRows(userId, recipeId, input.batches, input.preparedAt);
  if (!rows) return err({ code: "ITEM_NOT_FOUND", message: "Recipe not found." });
  return ok(rows.map(cookedRowToDto));
}
