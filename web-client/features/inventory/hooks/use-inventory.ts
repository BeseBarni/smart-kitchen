"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { invalidateAppDomains } from "@/lib/domain-invalidation";
import { inventoryApi } from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { ConsumeInventoryResult } from "../api/inventory.api";
import type { InventoryInput, InventoryItem, InventoryListFilters, InventorySummary, InventoryUpdate } from "../types";

export function useInventory(filters: InventoryListFilters = {}): UseQueryResult<InventoryItem[], Error> {
  return useQuery({ queryKey: inventoryKeys.list(filters), queryFn: () => inventoryApi.list(filters) });
}

export function useInventorySummary(): UseQueryResult<InventorySummary, Error> {
  return useQuery({ queryKey: inventoryKeys.summary(), queryFn: inventoryApi.summary });
}

export function useExpiringInventory(withinHours = 48): UseQueryResult<InventoryItem[], Error> {
  return useQuery({
    queryKey: inventoryKeys.expiring(withinHours),
    queryFn: () => inventoryApi.expiring(withinHours),
  });
}

interface InventoryMutations {
  create: UseMutationResult<InventoryItem, Error, InventoryInput>;
  update: UseMutationResult<InventoryItem, Error, { id: string; input: InventoryUpdate }>;
  remove: UseMutationResult<{ deleted: true }, Error, string>;
  adjust: UseMutationResult<InventoryItem, Error, { id: string; delta: 1 | -1 }>;
  consume: UseMutationResult<ConsumeInventoryResult, Error, { id: string; quantity: number }>;
  discard: UseMutationResult<InventoryItem, Error, string>;
}

export function useInventoryMutations(): InventoryMutations {
  const client = useQueryClient();
  const refreshInventory = async (): Promise<void> => invalidateAppDomains(client, ["inventory"]);
  const refreshConsumption = async (): Promise<void> => invalidateAppDomains(client, ["inventory", "meal-logs"]);
  const create = useMutation({ mutationFn: inventoryApi.create, onSuccess: refreshInventory });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InventoryUpdate }) => inventoryApi.update(id, input),
    onSuccess: refreshInventory,
  });
  const remove = useMutation({ mutationFn: inventoryApi.remove, onSuccess: refreshInventory });
  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: 1 | -1 }) => inventoryApi.adjust(id, { delta }),
    onMutate: async ({ id, delta }) => {
      await client.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = client.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.lists() });
      for (const [key, items] of previous) {
        if (!items) continue;
        client.setQueryData<InventoryItem[]>(key, items.flatMap((item) => {
          if (item.id !== id) return [item];
          const remainingQuantity = item.remainingQuantity + delta;
          return remainingQuantity <= 0 ? [] : [{ ...item, remainingQuantity }];
        }));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: refreshInventory,
  });
  const consume = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      inventoryApi.consume(id, { quantity }),
    onSuccess: refreshConsumption,
  });
  const discard = useMutation({ mutationFn: inventoryApi.discard, onSuccess: refreshInventory });
  return { create, update, remove, adjust, consume, discard };
}
