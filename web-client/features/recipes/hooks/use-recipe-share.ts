"use client";

import type { RecipeDto, RecipeShareStatusDto } from "@app/modules/schemas";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import { recipesApi } from "../api/recipes.api";
import { recipesKeys } from "../api/recipes.keys";

export type RecipeShareAction = "enable" | "regenerate" | "revoke";
export interface RecipeShareMutationInput {
  id: string;
  action: RecipeShareAction;
}

function updateCachedShare(
  client: ReturnType<typeof useQueryClient>,
  id: string,
  token: string | null,
  sharedAt: string | null,
): void {
  const detailKey = recipesKeys.detail(id);
  client.setQueryData<RecipeDto>(detailKey, (recipe) =>
    recipe ? { ...recipe, shareToken: token, sharedAt } : recipe,
  );
  client.setQueriesData<RecipeDto[]>({ queryKey: recipesKeys.lists() }, (recipes) =>
    recipes?.map((recipe) => recipe.id === id ? { ...recipe, shareToken: token, sharedAt } : recipe),
  );
}

function toRecipeShareFields(status: RecipeShareStatusDto): Pick<RecipeDto, "shareToken" | "sharedAt"> {
  return { shareToken: status.shareToken, sharedAt: status.sharedAt };
}

export function useRecipeShare(): UseMutationResult<
  RecipeShareStatusDto,
  Error,
  RecipeShareMutationInput,
  Awaited<ReturnType<typeof snapshotQueryCaches>>
> {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["recipes", "share"],
    mutationFn: ({ id, action }) =>
      action === "revoke"
        ? recipesApi.revokeShare(id)
        : recipesApi.enableShare(id, { regenerate: action === "regenerate" }),
    onMutate: async ({ id, action }) => {
      const context = await snapshotQueryCaches(client, [recipesKeys.all]);
      if (action === "revoke") {
        updateCachedShare(client, id, null, null);
      } else {
        updateCachedShare(client, id, null, new Date().toISOString());
      }
      return context;
    },
    onSuccess: (status, { id }) => {
      const fields = toRecipeShareFields(status);
      updateCachedShare(client, id, fields.shareToken, fields.sharedAt);
    },
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context, "recipes.shareError"),
    onSettled: async () => {
      await settleDomainQueries(client, ["recipes", "share"], [recipesKeys.all]);
    },
  });
}
