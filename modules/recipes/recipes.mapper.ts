import { numericToNumber } from "../shared/numeric";
import type { IngredientDto } from "../ingredients/ingredients.schema";
import type { InventoryItemDto } from "../inventory/inventory.schema";
import type {
  CreateRecipeInput,
  RecipeDto,
} from "./recipes.schema";
import { cookRecipeRows, findRecipe, listRecipeRows } from "./recipes.repo";

type RecipeDetail = NonNullable<Awaited<ReturnType<typeof findRecipe>>>;
type IngredientRow = Exclude<RecipeDetail["lines"][number]["ingredient"], null>;
type RecipeListRow = Awaited<ReturnType<typeof listRecipeRows>>[number];
type CookedRow = NonNullable<Awaited<ReturnType<typeof cookRecipeRows>>>[number];
export type RecipeLineInput = CreateRecipeInput["ingredients"][number];
export type RecipeValues = {
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
  costPerServing: number | null;
};

const macroFields = [
  ["caloriesPerServing", "calories"],
  ["proteinPerServing", "proteinG"],
  ["carbsPerServing", "carbsG"],
  ["fatPerServing", "fatG"],
] as const;

export function ingredientRowToDto(row: IngredientRow): IngredientDto {
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

export function recipeDto(recipe: RecipeDetail["recipe"], lines: RecipeDetail["lines"]): RecipeDto {
  return {
    ...recipe,
    servings: Number(recipe.servings),
    caloriesPerServing: numericToNumber(recipe.caloriesPerServing),
    proteinPerServing: numericToNumber(recipe.proteinPerServing),
    carbsPerServing: numericToNumber(recipe.carbsPerServing),
    fatPerServing: numericToNumber(recipe.fatPerServing),
    costPerServing: numericToNumber(recipe.costPerServing),
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    ingredients: lines.map(({ line, ingredient }) => ({
      ...line,
      quantity: Number(line.quantity),
      linkedIngredient: ingredient ? ingredientRowToDto(ingredient) : undefined,
    })),
  };
}

export function recipeListDto(recipe: RecipeListRow): RecipeDto {
  return {
    ...recipe,
    servings: Number(recipe.servings),
    caloriesPerServing: numericToNumber(recipe.caloriesPerServing),
    proteinPerServing: numericToNumber(recipe.proteinPerServing),
    carbsPerServing: numericToNumber(recipe.carbsPerServing),
    fatPerServing: numericToNumber(recipe.fatPerServing),
    costPerServing: numericToNumber(recipe.costPerServing),
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    ingredients: [],
  };
}

export function calculateRecipeValues(
  lines: RecipeLineInput[],
  linked: Map<string, IngredientDto>,
  servings: number,
): RecipeValues {
  const result: RecipeValues = {
    caloriesPerServing: null,
    proteinPerServing: null,
    carbsPerServing: null,
    fatPerServing: null,
    costPerServing: null,
  };
  if (lines.length === 0 || servings <= 0) return result;
  for (const [resultField, ingredientField] of macroFields) {
    const amounts = lines.map((line) => {
      const ingredient = line.ingredientId ? linked.get(line.ingredientId) : undefined;
      if (!ingredient || line.unit !== ingredient.defaultUnit || ingredient[ingredientField] === null) {
        return null;
      }
      return (ingredient[ingredientField] * line.quantity) / ingredient.baseQuantity;
    });
    result[resultField] = amounts.every((value) => value !== null)
      ? amounts.reduce<number>((total, value) => total + (value ?? 0), 0) / servings
      : null;
  }
  const costs = lines.map((line) => {
    const ingredient = line.ingredientId ? linked.get(line.ingredientId) : undefined;
    if (
      !ingredient ||
      line.unit !== ingredient.priceUnit ||
      ingredient.priceAmount === null ||
      ingredient.priceQuantity === null
    ) {
      return null;
    }
    return (ingredient.priceAmount * line.quantity) / ingredient.priceQuantity;
  });
  result.costPerServing = costs.every((value) => value !== null)
    ? costs.reduce<number>((total, value) => total + (value ?? 0), 0) / servings
    : null;
  return result;
}

export function withRecipeOverrides(input: CreateRecipeInput, computed: RecipeValues): RecipeValues {
  return {
    caloriesPerServing: input.caloriesPerServing ?? computed.caloriesPerServing,
    proteinPerServing: input.proteinPerServing ?? computed.proteinPerServing,
    carbsPerServing: input.carbsPerServing ?? computed.carbsPerServing,
    fatPerServing: input.fatPerServing ?? computed.fatPerServing,
    costPerServing: input.costPerServing ?? computed.costPerServing,
  };
}

export function chooseComputedValue(
  requested: number | null | undefined,
  derived: number | null | undefined,
  recompute: boolean,
): number | null | undefined {
  if (requested !== undefined && requested !== null) return requested;
  return recompute || requested === null ? derived ?? null : undefined;
}

export function cookedRowToDto(row: CookedRow): InventoryItemDto {
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
