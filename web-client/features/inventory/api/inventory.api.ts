import type {
  AdjustInventoryInput,
  BatchCreateInventoryInput,
  BatchCreateInventoryOutput,
  ConsumeInventoryInput,
  CreateInventoryItemInput,
  InventoryItemDto,
  InventorySummaryDto,
  ListInventoryQuery,
  MealLogDto,
  UpdateInventoryItemInput,
} from "@app/modules/schemas";
import {
  batchCreateInventoryOutputSchema,
  inventoryItemSchema,
  inventorySummarySchema,
  mealLogSchema,
} from "@app/modules/schemas";
import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";

export interface ConsumeInventoryResult {
  updatedItem: InventoryItemDto;
  mealLog: MealLogDto;
}

export const inventoryApi = {
  list: async (query: Partial<ListInventoryQuery> = {}): Promise<InventoryItemDto[]> => {
    const { limit, offset, ...filters } = query;
    return unwrapApiResponse(
      await apiClient.api.inventory.$get({
        query: {
          ...filters,
          ...(limit === undefined ? {} : { limit: String(limit) }),
          ...(offset === undefined ? {} : { offset: String(offset) }),
        },
      }),
      z.array(inventoryItemSchema),
    );
  },
  summary: async (): Promise<InventorySummaryDto> =>
    unwrapApiResponse(await apiClient.api.inventory.summary.$get(), inventorySummarySchema),
  expiring: async (withinHours = 48): Promise<InventoryItemDto[]> =>
    unwrapApiResponse(await apiClient.api.inventory.expiring.$get({ query: { withinHours: String(withinHours) } }), z.array(inventoryItemSchema)),
  getById: async (id: string): Promise<InventoryItemDto> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].$get({ param: { id } }), inventoryItemSchema),
  create: async (input: CreateInventoryItemInput): Promise<InventoryItemDto> =>
    unwrapApiResponse(await apiClient.api.inventory.$post({ json: input }), inventoryItemSchema),
  batchCreate: async (input: BatchCreateInventoryInput): Promise<BatchCreateInventoryOutput> =>
    unwrapApiResponse(
      await apiClient.api.inventory.batch.$post({ json: input }),
      batchCreateInventoryOutputSchema,
    ),
  update: async (id: string, input: UpdateInventoryItemInput): Promise<InventoryItemDto> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].$patch({ param: { id }, json: input }), inventoryItemSchema),
  remove: async (id: string): Promise<{ deleted: true }> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].$delete({ param: { id } }), z.object({ deleted: z.literal(true) })),
  adjust: async (id: string, input: AdjustInventoryInput): Promise<InventoryItemDto> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].adjust.$patch({ param: { id }, json: input }), inventoryItemSchema),
  consume: async (id: string, input: ConsumeInventoryInput): Promise<ConsumeInventoryResult> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].consume.$post({ param: { id }, json: input }), z.object({
      updatedItem: inventoryItemSchema,
      mealLog: mealLogSchema,
    })),
  discard: async (id: string): Promise<InventoryItemDto> =>
    unwrapApiResponse(await apiClient.api.inventory[":id"].discard.$post({ param: { id } }), inventoryItemSchema),
};
