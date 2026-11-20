import type {
  CookRecipeInput,
  CreateRecipeInput,
  RecipeDto,
  UpdateRecipeInput,
} from "@app/modules/schemas";
import {
  inventoryItemSchema,
  recipeSchema,
} from "@app/modules/schemas";
import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";
import type { RecipeListFilters } from "../types";

export const recipesApi = {
  list: async (query: RecipeListFilters = {}): Promise<RecipeDto[]> => {
    const { limit, offset, maxPrepTimeMin, ...filters } = query;
    return unwrapApiResponse(
      await apiClient.api.recipes.$get({
        query: {
          ...filters,
          ...(limit === undefined ? {} : { limit: String(limit) }),
          ...(offset === undefined ? {} : { offset: String(offset) }),
          ...(maxPrepTimeMin === undefined ? {} : { maxPrepTimeMin: String(maxPrepTimeMin) }),
        },
      }),
      z.array(recipeSchema),
    );
  },
  getById: async (id: string): Promise<RecipeDto> =>
    unwrapApiResponse(await apiClient.api.recipes[":id"].$get({ param: { id } }), recipeSchema),
  create: async (input: CreateRecipeInput): Promise<RecipeDto> =>
    unwrapApiResponse(await apiClient.api.recipes.$post({ json: input }), recipeSchema),
  update: async (id: string, input: UpdateRecipeInput): Promise<RecipeDto> =>
    unwrapApiResponse(await apiClient.api.recipes[":id"].$patch({ param: { id }, json: input }), recipeSchema),
  remove: async (id: string): Promise<{ deleted: true }> =>
    unwrapApiResponse(await apiClient.api.recipes[":id"].$delete({ param: { id } }), z.object({ deleted: z.literal(true) })),
  cookAndStock: async (id: string, input: CookRecipeInput) =>
    unwrapApiResponse(await apiClient.api.recipes[":id"].cook.$post({ param: { id }, json: input }), z.array(inventoryItemSchema)),
};
