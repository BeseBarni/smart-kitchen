"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { getText } from "@/lib/i18n";
import { snapshotQueryCaches, rollbackOptimisticMutation, settleDomainQueries } from "@/lib/optimistic";
import { inventoryApi } from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { InventoryDetail, InventoryItem, InventorySummary } from "../types";

export interface StorageSwitchInput {
  id: string;
  storageLocation: "fridge" | "freezer" | "pantry";
  recalculateExpiry?: boolean;
}

export function useSwitchStorage(): UseMutationResult<InventoryDetail, Error, StorageSwitchInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, storageLocation, recalculateExpiry = true }) =>
      inventoryApi.switchStorage(id, { storageLocation, recalculateExpiry }),
    mutationKey: ["inventory", "switch-storage"],
    onMutate: async ({ id, storageLocation, recalculateExpiry = true }) => {
      const context = await snapshotQueryCaches(client, [
        inventoryKeys.all,
        inventoryKeys.detail(id),
      ]);
      for (const [key, items] of client.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.lists() })) {
        if (!items) continue;
        const original = items.find((item) => item.id === id);
        const remaining = items.filter((item) => item.id !== id);
        if (!original) continue;
        const updated = optimisticStorageItem(original, storageLocation, recalculateExpiry);
        const filter = (key[2] as { storageLocation?: string } | undefined)?.storageLocation;
        client.setQueryData<InventoryItem[]>(key, !filter || filter === storageLocation
          ? [updated, ...remaining]
          : remaining);
      }
      for (const [, items] of client.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.lists() })) {
        const original = items?.find((item) => item.id === id);
        if (original) {
          client.setQueryData<InventorySummary>(inventoryKeys.summary(), (summary) => {
            if (!summary || original.storageLocation === storageLocation) return summary;
            return {
              ...summary,
              byLocation: {
                ...summary.byLocation,
                [original.storageLocation]: {
                  items: Math.max(0, summary.byLocation[original.storageLocation].items - 1),
                  quantity: Math.max(0, summary.byLocation[original.storageLocation].quantity - original.remainingQuantity),
                },
                [storageLocation]: {
                  items: summary.byLocation[storageLocation].items + 1,
                  quantity: summary.byLocation[storageLocation].quantity + original.remainingQuantity,
                },
              },
            };
          });
          break;
        }
      }
      client.setQueryData<InventoryDetail>(inventoryKeys.detail(id), (detail) =>
        detail ? optimisticDetail(detail, storageLocation, recalculateExpiry) : detail);
      return context;
    },
    onSuccess: (detail, { id }) => {
      client.setQueryData(inventoryKeys.detail(id), detail);
      for (const [key, items] of client.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.lists() })) {
        if (!items) continue;
        const remaining = items.filter((item) => item.id !== id);
        const filter = (key[2] as { storageLocation?: string } | undefined)?.storageLocation;
        const listItem = detailToListItem(detail);
        client.setQueryData(key, !filter || filter === detail.storageLocation
          ? [listItem, ...remaining]
          : remaining);
      }
    },
    onError: (_error, _input, context) => {
      rollbackOptimisticMutation(context);
      toast.error(getText("inventory.storageSwitchError"));
    },
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "switch-storage"], [inventoryKeys.all]);
    },
  });
}

function optimisticStorageItem(
  item: InventoryItem,
  location: "fridge" | "freezer" | "pantry",
  recalculateExpiry: boolean,
): InventoryItem {
  const shelfLife = item.shelfLifeDays?.[location];
  if (!recalculateExpiry || typeof shelfLife !== "number") return { ...item, storageLocation: location };
  const days = item.storageLocation === "freezer" && location === "fridge"
    ? Math.min(shelfLife, 4)
    : shelfLife;
  return {
    ...item,
    storageLocation: location,
    expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(),
  };
}

function optimisticDetail(
  detail: InventoryDetail,
  location: "fridge" | "freezer" | "pantry",
  recalculateExpiry: boolean,
): InventoryDetail {
  return {
    ...detail,
    ...optimisticStorageItem(detail, location, recalculateExpiry),
  };
}

function detailToListItem(detail: InventoryDetail): InventoryItem {
  return {
    id: detail.id,
    userId: detail.userId,
    name: detail.name,
    itemType: detail.itemType,
    recipeId: detail.recipeId,
    ingredientId: detail.ingredientId,
    storageLocation: detail.storageLocation,
    status: detail.status,
    initialQuantity: detail.initialQuantity,
    remainingQuantity: detail.remainingQuantity,
    unit: detail.unit,
    preparedAt: detail.preparedAt,
    expiresAt: detail.expiresAt,
    imageUrl: detail.imageUrl,
    caloriesPerUnit: detail.caloriesPerUnit,
    proteinPerUnit: detail.proteinPerUnit,
    carbsPerUnit: detail.carbsPerUnit,
    fatPerUnit: detail.fatPerUnit,
    fiberPerUnit: detail.fiberPerUnit,
    costPerUnit: detail.costPerUnit,
    currency: detail.currency,
    shelfLifeDays: detail.shelfLifeDays,
    tags: detail.tags,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}
