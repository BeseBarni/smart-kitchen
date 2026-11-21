"use client";

import type {
  CookRecipeInput,
  CreateRecipeInput,
  RecipeDto,
  UpdateRecipeInput,
  InventoryItemDto,
} from "@app/modules/schemas";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { recipesApi } from "../api/recipes.api";
import { recipesKeys } from "../api/recipes.keys";
import type { RecipeListFilters } from "../types";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import {
  insertCookedBatches,
  insertOptimisticRecipe,
  removeOptimisticRecipe,
  replaceCookedBatchIds,
  replaceOptimisticRecipe,
  updateOptimisticRecipe,
} from "../utils/recipe-cache.utils";
import { inventoryKeys } from "@/features/inventory";

export function useRecipes(filters: RecipeListFilters = {}): UseQueryResult<RecipeDto[], Error> {
  return useQuery({
    queryKey: recipesKeys.list(filters),
    queryFn: () => recipesApi.list(filters),
  });
}

export function useRecipe(id: string | null): UseQueryResult<RecipeDto, Error> {
  return useQuery({
    queryKey: recipesKeys.detail(id ?? ""),
    queryFn: () => recipesApi.getById(id ?? ""),
    enabled: Boolean(id),
  });
}

interface RecipeMutations {
  create: UseMutationResult<RecipeDto, Error, CreateRecipeInput>;
  update: UseMutationResult<RecipeDto, Error, { id: string; input: UpdateRecipeInput }>;
  remove: UseMutationResult<{ deleted: true }, Error, string>;
  cookAndStock: UseMutationResult<InventoryItemDto[], Error, { id: string; input: CookRecipeInput }>;
}

export function useRecipeMutations(): RecipeMutations {
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: recipesApi.create,
    mutationKey: ["recipes", "create"],
    onMutate: async (input) => {
      const context = await snapshotQueryCaches(client, [recipesKeys.all]);
      const recipe = insertOptimisticRecipe(client, input);
      return { ...context, optimisticId: recipe.id };
    },
    onSuccess: (recipe, _input, context) => replaceOptimisticRecipe(client, context.optimisticId, recipe),
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["recipes", "create"], [recipesKeys.all]);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) => recipesApi.update(id, input),
    mutationKey: ["recipes", "update"],
    onMutate: async ({ id, input }) => {
      const context = await snapshotQueryCaches(client, [recipesKeys.all]);
      updateOptimisticRecipe(client, id, input);
      return context;
    },
    onSuccess: (recipe, { id }) => replaceOptimisticRecipe(client, id, recipe),
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["recipes", "update"], [recipesKeys.all]);
    },
  });
  const remove = useMutation({
    mutationFn: recipesApi.remove,
    mutationKey: ["recipes", "remove"],
    onMutate: async (id) => {
      const context = await snapshotQueryCaches(client, [recipesKeys.all]);
      removeOptimisticRecipe(client, id);
      return context;
    },
    onError: (_error, _id, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["recipes", "remove"], [recipesKeys.all]);
    },
  });
  const cookAndStock = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CookRecipeInput }) => recipesApi.cookAndStock(id, input),
    mutationKey: ["recipes", "cook"],
    onMutate: async ({ id, input }) => {
      const context = await snapshotQueryCaches(client, [recipesKeys.all, inventoryKeys.all]);
      const recipe = client.getQueryData<RecipeDto>(recipesKeys.detail(id)) ??
        client.getQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() }).flatMap(([, recipes]) => recipes ?? [])
          .find((entry) => entry.id === id);
      if (!recipe) return { ...context, optimisticIds: [] as string[] };
      const batches = insertCookedBatches(client, recipe, input);
      return { ...context, optimisticIds: batches.map((batch) => batch.id) };
    },
    onSuccess: (stocked, _variables, context) =>
      replaceCookedBatchIds(client, context.optimisticIds, stocked),
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["recipes", "cook"], [recipesKeys.all, inventoryKeys.all]);
    },
  });
  return { create, update, remove, cookAndStock };
}
