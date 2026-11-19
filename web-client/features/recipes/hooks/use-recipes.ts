"use client";

import { useMutation, useMutationState, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { recipesApi } from "../api/recipes.api";
import { recipesKeys } from "../api/recipes.keys";
import type { FavoriteUpdate, Recipe } from "../types";

export function useRecipes(): UseQueryResult<Recipe[], Error> {
  return useQuery({ queryKey: recipesKeys.list(), queryFn: recipesApi.list });
}

export function useFavoriteMutation(): UseMutationResult<Recipe, Error, FavoriteUpdate> {
  const client = useQueryClient();
  return useMutation({
    mutationKey: recipesKeys.favorite(),
    mutationFn: recipesApi.setFavorite,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: recipesKeys.list() }); },
  });
}

export function usePendingFavorites(): string[] {
  return useMutationState({
    filters: { mutationKey: recipesKeys.favorite(), status: "pending" },
    select: (mutation) => {
      const variables = mutation.state.variables;
      return typeof variables === "object" && variables !== null && "id" in variables &&
        typeof variables.id === "string" ? variables.id : undefined;
    },
  }).filter((id): id is string => id !== undefined);
}
