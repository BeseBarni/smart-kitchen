"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { InventoryInput, InventoryItem, PortionAdjustment } from "../types";

export function useInventory(): UseQueryResult<InventoryItem[], Error> {
  return useQuery({ queryKey: inventoryKeys.list(), queryFn: inventoryApi.list });
}

interface InventoryMutations {
  create: UseMutationResult<InventoryItem, Error, InventoryInput>;
  update: UseMutationResult<InventoryItem, Error, { id: string; input: InventoryInput }>;
  adjust: UseMutationResult<void, Error, PortionAdjustment>;
}

export function useInventoryMutations(): InventoryMutations {
  const client = useQueryClient();
  const refresh = async (): Promise<void> => {
    await client.invalidateQueries({ queryKey: inventoryKeys.all });
  };
  const create = useMutation({ mutationFn: inventoryApi.create, onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InventoryInput }) => inventoryApi.update(id, input),
    onSuccess: refresh,
  });
  const adjust = useMutation({ mutationFn: inventoryApi.adjust, onSuccess: refresh });
  return { create, update, adjust };
}
