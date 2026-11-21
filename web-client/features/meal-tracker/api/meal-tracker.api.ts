import {
  dailyMealSummarySchema, inventoryItemSchema, mealLogSchema, mealSuggestionsResponseSchema, profileSchema,
  type ConsumeInventoryInput, type CreateMealLogInput, type MealLogDto, type UpdateProfileInput,
} from "@app/modules/schemas";
import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";
import type { SupportedLocale } from "@/lib/i18n";

export const mealTrackerApi = {
  summary: async (date: string, range: { from: string; to: string }) =>
    unwrapApiResponse(await apiClient.api["meal-logs"]["daily-summary"].$get({
      query: { date, ...range },
    }), dailyMealSummarySchema),
  logs: async (range: { from: string; to: string }): Promise<MealLogDto[]> => {
    const result: MealLogDto[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await unwrapApiResponse(await apiClient.api["meal-logs"].$get({
        query: { ...range, limit: "100", offset: String(offset) },
      }), z.array(mealLogSchema));
      result.push(...page);
      if (page.length < 100) return result;
    }
  },
  create: async (input: CreateMealLogInput) =>
    unwrapApiResponse(await apiClient.api["meal-logs"].$post({ json: input }), mealLogSchema),
  consume: async (id: string, input: ConsumeInventoryInput) =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].consume.$post({
      param: { id }, json: input,
    }), z.object({ updatedItem: inventoryItemSchema, mealLog: mealLogSchema })),
  remove: async (id: string, restoreInventory: boolean) =>
    unwrapApiResponse(await apiClient.api["meal-logs"][":id"].$delete({
      param: { id }, query: { restoreInventory: restoreInventory ? "true" : "false", requireInventory: restoreInventory ? "true" : "false" },
    }), z.object({ deleted: z.literal(true) })),
  profile: async () => unwrapApiResponse(await apiClient.api.profile.$get(), profileSchema),
  updateProfile: async (input: UpdateProfileInput) =>
    unwrapApiResponse(await apiClient.api.profile.$patch({ json: input }), profileSchema),
  suggestions: async (date: string, range: { from: string; to: string }, locale: SupportedLocale) =>
    unwrapApiResponse(await apiClient.api["meal-suggestions"].$post({
      json: { date, ...range, locale },
    }), mealSuggestionsResponseSchema),
};
