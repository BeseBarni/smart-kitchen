"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ConsumeInventoryInput } from "@app/modules/schemas";
import { invalidateAppDomains } from "@/lib/domain-invalidation";
import { mealTrackerApi } from "../api/meal-tracker.api";
import { getText } from "@/lib/i18n";
import { getErrorText } from "@/lib/i18n/error-text";

export function useMealLogMutations() {
  const client = useQueryClient();
  const failure = (error: Error): void => { toast.error(getErrorText(error, "mealTracker.operationError")); };
  const create = useMutation({
    mutationFn: mealTrackerApi.create,
    onSuccess: async () => { await invalidateAppDomains(client, ["meal-logs"]); toast.success(getText("mealTracker.mealLogged")); },
    onError: failure,
  });
  const consume = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConsumeInventoryInput }) => mealTrackerApi.consume(id, input),
    onSuccess: async () => { await invalidateAppDomains(client, ["meal-logs", "inventory"]); toast.success(getText("mealTracker.mealLogged")); },
    onError: failure,
  });
  const remove = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore: boolean }) => mealTrackerApi.remove(id, restore),
    onSuccess: async (_data, variables) => {
      await invalidateAppDomains(client, variables.restore ? ["meal-logs", "inventory"] : ["meal-logs"]);
      toast.success(getText("mealTracker.mealDeleted"));
    },
    onError: failure,
  });
  const targets = useMutation({
    mutationFn: mealTrackerApi.updateProfile,
    onSuccess: async () => { await invalidateAppDomains(client, ["profile", "meal-logs"]); toast.success(getText("mealTracker.targetsUpdated")); },
    onError: failure,
  });
  return { create, consume, remove, targets };
}
