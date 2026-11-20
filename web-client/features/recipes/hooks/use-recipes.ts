"use client";

import type {
  CookRecipeInput,
  CreateRecipeInput,
  RecipeDto,
  UpdateRecipeInput,
  InventoryItemDto,
} from "@app/modules/schemas";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { invalidateAppDomains } from "@/lib/domain-invalidation";
import { recipesApi } from "../api/recipes.api";
import { recipesKeys } from "../api/recipes.keys";
import type { RecipeListFilters } from "../types";

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
  const refreshRecipes = async (): Promise<void> => {
    await client.invalidateQueries({ queryKey: recipesKeys.all });
  };
  const create = useMutation({ mutationFn: recipesApi.create, onSuccess: refreshRecipes });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) => recipesApi.update(id, input),
    onSuccess: refreshRecipes,
  });
  const remove = useMutation({ mutationFn: recipesApi.remove, onSuccess: refreshRecipes });
  const cookAndStock = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CookRecipeInput }) => recipesApi.cookAndStock(id, input),
    onSuccess: async () => invalidateAppDomains(client, ["recipes", "inventory"]),
  });
  return { create, update, remove, cookAndStock };
}
