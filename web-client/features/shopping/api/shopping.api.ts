import { z } from "zod";
import {
  shoppingItemSchema,
  shoppingSuggestionSchema,
  type ShoppingItemDto,
  type ShoppingItemInput,
  type ShoppingSuggestion,
} from "@app/modules/schemas";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";

export const shoppingApi = {
  list: async (): Promise<ShoppingItemDto[]> =>
    unwrapApiResponse(await apiClient.api.shopping.$get(), z.array(shoppingItemSchema)),
  compare: async (items: ShoppingItemInput[]): Promise<ShoppingSuggestion[]> =>
    unwrapApiResponse(await apiClient.api.shopping.compare.$post({ json: { items } }), z.array(shoppingSuggestionSchema)),
  add: async (items: ShoppingItemInput[]): Promise<ShoppingItemDto[]> =>
    unwrapApiResponse(await apiClient.api.shopping.$post({ json: { items } }), z.array(shoppingItemSchema)),
  remove: async (id: string): Promise<{ deleted: true }> =>
    unwrapApiResponse(await apiClient.api.shopping[":id"].$delete({ param: { id } }), z.object({ deleted: z.literal(true) })),
};
