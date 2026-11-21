"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { ConsumeInventoryResult } from "../api/inventory.api";
import type { InventoryInput, InventoryItem, InventoryListFilters, InventorySummary, InventoryUpdate } from "../types";
import {
  adjustOptimisticInventory,
  consumeOptimisticInventory,
  discardOptimisticInventory,
  insertOptimisticInventory,
  removeOptimisticInventory,
  replaceOptimisticInventory,
  replaceOptimisticMealLog,
  updateOptimisticInventory,
} from "../utils/inventory-cache.utils";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";

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
  const create = useMutation({
    mutationFn: inventoryApi.create,
    mutationKey: ["inventory", "create"],
    onMutate: async (input) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all]);
      const item = insertOptimisticInventory(client, input);
      return { ...context, optimisticId: item.id };
    },
    onSuccess: (item, _input, context) => {
      replaceOptimisticInventory(client, context.optimisticId, item);
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "create"], [inventoryKeys.all]);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InventoryUpdate }) => inventoryApi.update(id, input),
    mutationKey: ["inventory", "update"],
    onMutate: async ({ id, input }) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all]);
      updateOptimisticInventory(client, id, input);
      return context;
    },
    onSuccess: (item, { id }) => replaceOptimisticInventory(client, id, item),
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "update"], [inventoryKeys.all]);
    },
  });
  const remove = useMutation({
    mutationFn: inventoryApi.remove,
    mutationKey: ["inventory", "remove"],
    onMutate: async (id) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all]);
      removeOptimisticInventory(client, id);
      return context;
    },
    onError: (_error, _id, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "remove"], [inventoryKeys.all]);
    },
  });
  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: 1 | -1 }) => inventoryApi.adjust(id, { delta }),
    mutationKey: ["inventory", "adjust"],
    onMutate: async ({ id, delta }) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all]);
      adjustOptimisticInventory(client, id, delta);
      return context;
    },
    onSuccess: (item, { id }) => replaceOptimisticInventory(client, id, item),
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "adjust"], [inventoryKeys.all]);
    },
  });
  const consume = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      inventoryApi.consume(id, { quantity, requireFiber: true }),
    mutationKey: ["inventory", "consume"],
    onMutate: async ({ id, quantity }) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all, ["meal-tracker"]]);
      const optimistic = consumeOptimisticInventory(client, id, { quantity, requireFiber: true });
      return { ...context, optimisticId: optimistic?.item.id, logId: optimistic?.log.id };
    },
    onSuccess: (result, { id }, context) => {
      replaceOptimisticInventory(client, id, result.updatedItem);
      if (context.logId) replaceOptimisticMealLog(client, context.logId, result.mealLog);
    },
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "consume"], [inventoryKeys.all, ["meal-tracker"]]);
    },
  });
  const discard = useMutation({
    mutationFn: inventoryApi.discard,
    mutationKey: ["inventory", "discard"],
    onMutate: async (id) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all]);
      discardOptimisticInventory(client, id);
      return context;
    },
    onSuccess: (item) => replaceOptimisticInventory(client, item.id, item),
    onError: (_error, _id, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "discard"], [inventoryKeys.all]);
    },
  });
  return { create, update, remove, adjust, consume, discard };
}
