"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { InventoryDetail, InventoryItem } from "../types";

export function useInventoryDetail(id: string | null): UseQueryResult<InventoryDetail, Error> {
  const client = useQueryClient();
  const placeholderData = (): InventoryDetail | undefined => {
    if (!id) return undefined;
    for (const [, items] of client.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.lists() })) {
      const item = items?.find((entry) => entry.id === id);
      if (item) {
        return {
          ...item,
          freshness: {
            msRemaining: item.expiresAt
              ? new Date(item.expiresAt).getTime() - Date.now()
              : null,
            daysRemaining: item.expiresAt
              ? (new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000
              : null,
            isExpired: item.expiresAt
              ? new Date(item.expiresAt).getTime() < Date.now()
              : false,
            shelfLifeDaysForCurrentLocation: item.shelfLifeDays?.[item.storageLocation] ?? null,
          },
          recipe: null,
        };
      }
    }
    return undefined;
  };
  return useQuery({
    queryKey: inventoryKeys.detail(id ?? "missing"),
    queryFn: () => inventoryApi.getById(id!),
    enabled: Boolean(id),
    placeholderData,
  });
}
