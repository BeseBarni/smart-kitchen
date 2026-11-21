"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ConsumeInventoryInput } from "@app/modules/schemas";
import { mealTrackerApi } from "../api/meal-tracker.api";
import { getText } from "@/lib/i18n";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import { inventoryKeys, consumeOptimisticInventory, replaceOptimisticInventory } from "@/features/inventory";
import { mealTrackerKeys } from "../api/meal-tracker.keys";
import {
  insertOptimisticMealLog,
  patchOptimisticProfile,
  removeOptimisticMealLog,
  replaceOptimisticMealLog as replaceMealLog,
} from "../utils/meal-log-cache.utils";

export function useMealLogMutations() {
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: mealTrackerApi.create,
    mutationKey: ["meal-logs", "create"],
    onMutate: async (input) => {
      const context = await snapshotQueryCaches(client, [mealTrackerKeys.all]);
      const log = insertOptimisticMealLog(client, input);
      return { ...context, optimisticId: log.id };
    },
    onSuccess: (log, _input, context) => {
      replaceMealLog(client, context.optimisticId, log);
      toast.success(getText("mealTracker.mealLogged"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["meal-logs", "create"], [mealTrackerKeys.all]);
    },
  });
  const consume = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConsumeInventoryInput }) => mealTrackerApi.consume(id, input),
    mutationKey: ["inventory", "consume"],
    onMutate: async ({ id, input }) => {
      const context = await snapshotQueryCaches(client, [inventoryKeys.all, mealTrackerKeys.all]);
      const optimistic = consumeOptimisticInventory(client, id, input);
      return { ...context, optimisticId: optimistic?.item.id, logId: optimistic?.log.id };
    },
    onSuccess: (result, _variables, context) => {
      replaceOptimisticInventory(client, context.optimisticId ?? result.updatedItem.id, result.updatedItem);
      if (context.logId) replaceMealLog(client, context.logId, result.mealLog);
      toast.success(getText("mealTracker.mealLogged"));
    },
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["inventory", "consume"], [inventoryKeys.all, mealTrackerKeys.all]);
    },
  });
  const remove = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore: boolean }) => mealTrackerApi.remove(id, restore),
    mutationKey: ["meal-logs", "remove"],
    onMutate: async ({ id, restore }) => {
      const context = await snapshotQueryCaches(client, [
        mealTrackerKeys.all,
        ...(restore ? [inventoryKeys.all] : []),
      ]);
      removeOptimisticMealLog(client, id, restore);
      return context;
    },
    onSuccess: () => {
      toast.success(getText("mealTracker.mealDeleted"));
    },
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["meal-logs", "remove"], [mealTrackerKeys.all, inventoryKeys.all]);
    },
  });
  const targets = useMutation({
    mutationFn: mealTrackerApi.updateProfile,
    mutationKey: ["profile", "update"],
    onMutate: async (input) => {
      const context = await snapshotQueryCaches(client, [mealTrackerKeys.profile(), ["profile"]]);
      patchOptimisticProfile(client, input);
      return context;
    },
    onSuccess: (profile) => {
      patchOptimisticProfile(client, profile);
      toast.success(getText("mealTracker.targetsUpdated"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["profile", "update"], [mealTrackerKeys.profile(), ["profile"], ["meal-logs"]]);
    },
  });
  return { create, consume, remove, targets };
}
