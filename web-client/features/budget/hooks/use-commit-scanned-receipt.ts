import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CommitScannedReceiptInput,
  CreateReceiptInput,
  InventoryItemDto,
} from "@app/modules/schemas";
import { toast } from "sonner";
import { budgetApi } from "../api/budget.api";
import { budgetKeys } from "../api/budget.keys";
import { inventoryKeys } from "@/features/inventory";
import { getText } from "@/lib/i18n";
import {
  createOptimisticId,
  rollbackOptimisticMutation,
  settleDomainQueries,
  snapshotQueryCaches,
} from "@/lib/optimistic";
import { insertOptimisticReceipt, replaceOptimisticReceipt } from "../utils/budget-cache.utils";

function optimisticInventoryItem(
  input: CommitScannedReceiptInput,
  item: CommitScannedReceiptInput["items"][number],
  index: number,
): InventoryItemDto {
  const now = new Date().toISOString();
  return {
    id: createOptimisticId(),
    userId: "00000000-0000-0000-0000-000000000000",
    name: item.name,
    itemType: "ingredient",
    recipeId: null,
    ingredientId: null,
    storageLocation: item.storageLocation ?? "pantry",
    status: "in_stock",
    initialQuantity: item.quantity,
    remainingQuantity: item.quantity,
    unit: item.unit ?? "piece",
    preparedAt: now,
    expiresAt: item.expiresAt ?? null,
    imageUrl: null,
    imageAssetId: null,
    stockImageKind: item.stockImageKind ?? null,
    stockImageName: item.stockImageName ?? null,
    caloriesPerUnit: item.estimatedMacrosPerUnit?.calories ?? null,
    proteinPerUnit: item.estimatedMacrosPerUnit?.proteinG ?? null,
    carbsPerUnit: item.estimatedMacrosPerUnit?.carbsG ?? null,
    fatPerUnit: item.estimatedMacrosPerUnit?.fatG ?? null,
    fiberPerUnit: item.estimatedMacrosPerUnit?.fiberG ?? null,
    costPerUnit: item.amount / item.quantity,
    currency: input.currency,
    shelfLifeDays: item.shelfLifeDays ?? {},
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function useCommitScannedReceipt() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["budget", "receipts", "commit-scan"],
    mutationFn: budgetApi.commitScannedReceipt,
    onMutate: async (input: CommitScannedReceiptInput) => {
      const context = await snapshotQueryCaches(client, [budgetKeys.all, inventoryKeys.all]);
      const createInput: CreateReceiptInput = {
        ...(input.merchantId ? { merchantId: input.merchantId } : input.merchantName ? { merchantName: input.merchantName } : {}),
        source: "scanned",
        purchasedAt: input.purchasedAt,
        currency: input.currency,
        title: input.title ?? null,
        notes: input.notes ?? null,
        mediaAssetId: input.mediaAssetId,
        items: input.items.map((item) => ({
          name: item.name,
          rawReceiptText: item.rawReceiptText,
          categoryId: item.categoryId,
          amount: item.amount,
          quantity: item.quantity,
          unit: item.unit,
        })),
      };
      const optimistic = insertOptimisticReceipt(client, createInput);
      const stocked = input.items
        .map((item, index) => item.addToInventory ? optimisticInventoryItem(input, item, index) : null)
        .filter((item): item is InventoryItemDto => item !== null);
      for (const [key, data] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
        if (data) client.setQueryData(key, [...stocked, ...data]);
      }
      for (const [key, data] of client.getQueriesData<{
        totalItems: number;
        totalQuantity: number;
        byLocation: Record<"fridge" | "freezer" | "pantry", { items: number; quantity: number }>;
        expiringSoonCount: number;
      }>({ queryKey: inventoryKeys.summary() })) {
        if (!data) continue;
        const next = { ...data, totalItems: data.totalItems + stocked.length, totalQuantity: data.totalQuantity +
          stocked.reduce((sum, item) => sum + item.remainingQuantity, 0) };
        for (const item of stocked) next.byLocation[item.storageLocation].items += 1;
        client.setQueryData(key, next);
      }
      return { ...context, optimisticId: optimistic.id };
    },
    onSuccess: (result, _input, context) => {
      replaceOptimisticReceipt(client, context.optimisticId, result.receipt);
      toast.success(getText("budget.receiptCreated"));
    },
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => settleDomainQueries(
      client,
      ["budget", "receipts", "commit-scan"],
      [budgetKeys.all, ["merchants"], inventoryKeys.all],
    ),
  });
}
