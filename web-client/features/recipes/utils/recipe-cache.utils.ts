import type {
  CookRecipeInput,
  CreateRecipeInput,
  InventoryItemDto,
  RecipeDto,
  UpdateRecipeInput,
} from "@app/modules/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/features/inventory";
import type { InventorySummary } from "@/features/inventory";
import { createOptimisticId } from "@/lib/optimistic";
import { recipesKeys } from "../api/recipes.keys";
import type { RecipeListFilters } from "../types";

function matchesRecipeFilters(filters: RecipeListFilters, recipe: RecipeDto): boolean {
  if (filters.search && !recipe.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.source && recipe.source !== filters.source) return false;
  if (filters.isFreezerFriendly === "true" && !recipe.isFreezerFriendly) return false;
  if (filters.isFreezerFriendly === "false" && recipe.isFreezerFriendly) return false;
  if (filters.maxPrepTimeMin !== undefined &&
    (recipe.prepTimeMin === null || recipe.prepTimeMin >= filters.maxPrepTimeMin)) return false;
  return true;
}

export function optimisticRecipe(input: CreateRecipeInput): RecipeDto {
  const now = new Date().toISOString();
  const id = createOptimisticId();
  return {
    ...input,
    id,
    ingredients: input.ingredients.map((ingredient) => ({
      ...ingredient,
      id: createOptimisticId(),
      recipeId: id,
      linkedIngredient: undefined,
    })),
    caloriesPerServing: input.caloriesPerServing ?? null,
    proteinPerServing: input.proteinPerServing ?? null,
    carbsPerServing: input.carbsPerServing ?? null,
    fatPerServing: input.fatPerServing ?? null,
    fiberPerServing: input.fiberPerServing ?? null,
    costPerServing: input.costPerServing ?? null,
    userId: "",
    shelfLifeDays: input.shelfLifeDays ?? {},
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function insertOptimisticRecipe(client: QueryClient, input: CreateRecipeInput): RecipeDto {
  const recipe = optimisticRecipe(input);
  for (const [key, recipes] of client.getQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() })) {
    if (!recipes) continue;
    const filters = (key[2] ?? {}) as RecipeListFilters;
    if (matchesRecipeFilters(filters, recipe)) {
      client.setQueryData<RecipeDto[]>(key, [recipe, ...recipes]);
    }
  }
  return recipe;
}

export function replaceOptimisticRecipe(
  client: QueryClient,
  optimisticId: string,
  recipe: RecipeDto,
): void {
  for (const [key, recipes] of client.getQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() })) {
    if (!recipes) continue;
    client.setQueryData<RecipeDto[]>(key, recipes.map((entry) =>
      entry.id === optimisticId ? recipe : entry,
    ));
  }
  client.setQueryData<RecipeDto>(recipesKeys.detail(optimisticId), recipe);
  client.setQueryData<RecipeDto>(recipesKeys.detail(recipe.id), recipe);
}

export function updateOptimisticRecipe(
  client: QueryClient,
  id: string,
  input: UpdateRecipeInput,
): void {
  const patchRecipe = (recipe: RecipeDto): RecipeDto => ({
    ...recipe,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.prepTimeMin !== undefined ? { prepTimeMin: input.prepTimeMin } : {}),
    ...(input.cookTimeMin !== undefined ? { cookTimeMin: input.cookTimeMin } : {}),
    ...(input.servings !== undefined ? { servings: input.servings } : {}),
    ...(input.isFreezerFriendly !== undefined ? { isFreezerFriendly: input.isFreezerFriendly } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.caloriesPerServing !== undefined ? { caloriesPerServing: input.caloriesPerServing } : {}),
    ...(input.proteinPerServing !== undefined ? { proteinPerServing: input.proteinPerServing } : {}),
    ...(input.carbsPerServing !== undefined ? { carbsPerServing: input.carbsPerServing } : {}),
    ...(input.fatPerServing !== undefined ? { fatPerServing: input.fatPerServing } : {}),
    ...(input.fiberPerServing !== undefined ? { fiberPerServing: input.fiberPerServing } : {}),
    ...(input.costPerServing !== undefined ? { costPerServing: input.costPerServing } : {}),
    ...(input.ingredients !== undefined ? {
      ingredients: input.ingredients.map((ingredient) => ({
        ...ingredient,
        id: createOptimisticId(),
        recipeId: id,
        linkedIngredient: undefined,
      })),
    } : {}),
  });
  for (const [key, recipes] of client.getQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() })) {
    if (!recipes) continue;
    client.setQueryData<RecipeDto[]>(key, recipes.map((recipe) =>
      recipe.id === id ? patchRecipe(recipe) : recipe,
    ));
  }
  client.setQueryData<RecipeDto>(recipesKeys.detail(id), (recipe) =>
    recipe ? patchRecipe(recipe) : recipe,
  );
}

export function removeOptimisticRecipe(client: QueryClient, id: string): void {
  for (const [key, recipes] of client.getQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() })) {
    if (recipes) client.setQueryData<RecipeDto[]>(key, recipes.filter((recipe) => recipe.id !== id));
  }
  client.removeQueries({ queryKey: recipesKeys.detail(id) });
}

export function insertCookedBatches(
  client: QueryClient,
  recipe: RecipeDto,
  input: CookRecipeInput,
): InventoryItemDto[] {
  const now = new Date().toISOString();
  const batches = input.batches.map((batch) => ({
    id: createOptimisticId(),
    userId: "",
    name: recipe.title,
    itemType: "meal_prep" as const,
    recipeId: recipe.id,
    ingredientId: null,
    storageLocation: batch.storageLocation,
    status: "in_stock" as const,
    initialQuantity: batch.quantity,
    remainingQuantity: batch.quantity,
    unit: batch.unit ?? "portions",
    preparedAt: input.preparedAt ?? now,
    expiresAt: batch.expiresAt ?? null,
    imageUrl: recipe.imageUrl,
    caloriesPerUnit: recipe.caloriesPerServing,
    proteinPerUnit: recipe.proteinPerServing,
    carbsPerUnit: recipe.carbsPerServing,
    fatPerUnit: recipe.fatPerServing,
    fiberPerUnit: recipe.fiberPerServing,
    costPerUnit: recipe.costPerServing,
    currency: recipe.currency,
    shelfLifeDays: recipe.shelfLifeDays ?? {},
    tags: [],
    createdAt: now,
    updatedAt: now,
  }));
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    const filters = (key[2] ?? {}) as { storageLocation?: InventoryItemDto["storageLocation"]; status?: InventoryItemDto["status"]; search?: string };
    const matching = batches.filter((batch) =>
      (!filters.storageLocation || batch.storageLocation === filters.storageLocation) &&
      (!filters.status || batch.status === filters.status) &&
      (!filters.search || batch.name.toLowerCase().includes(filters.search.toLowerCase())),
    );
    if (matching.length) client.setQueryData<InventoryItemDto[]>(key, [...matching, ...items]);
  }
  client.setQueryData<InventorySummary>(inventoryKeys.summary(), (summary) => {
    if (!summary) return summary;
    const byLocation = { ...summary.byLocation };
    for (const batch of batches) {
      const location = byLocation[batch.storageLocation];
      byLocation[batch.storageLocation] = {
        items: location.items + 1,
        quantity: location.quantity + batch.remainingQuantity,
      };
    }
    return {
      ...summary,
      totalItems: summary.totalItems + batches.length,
      totalQuantity: summary.totalQuantity +
        batches.reduce((total, batch) => total + batch.remainingQuantity, 0),
      byLocation,
    };
  });
  return batches;
}

export function replaceCookedBatchIds(
  client: QueryClient,
  optimisticIds: readonly string[],
  stocked: readonly InventoryItemDto[],
): void {
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    client.setQueryData<InventoryItemDto[]>(key, items.map((item) => {
      const index = optimisticIds.indexOf(item.id);
      return index >= 0 ? stocked[index] ?? item : item;
    }));
  }
}
