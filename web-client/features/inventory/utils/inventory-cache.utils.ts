import type {
  ConsumeInventoryInput,
  InventoryItemDto,
  InventorySummaryDto,
  MealLogDto,
} from "@app/modules/schemas";
import { dailyMealSummarySchema } from "@app/modules/schemas";
import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import { estimatedExpiry } from "@app/shared";
import { createOptimisticId } from "@/lib/optimistic";
import { inventoryKeys } from "../api/inventory.keys";
import type { InventoryInput, InventoryListFilters, InventoryUpdate } from "../types";

type DailyMealSummaryDto = z.infer<typeof dailyMealSummarySchema>;

function matchesFilters(filters: InventoryListFilters, item: InventoryItemDto): boolean {
  if (filters.storageLocation && item.storageLocation !== filters.storageLocation) return false;
  if ((filters.status ?? "in_stock") !== item.status) return false;
  if (filters.itemType && item.itemType !== filters.itemType) return false;
  if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
  return true;
}

export function patchInventoryList(
  client: QueryClient,
  updater: (items: InventoryItemDto[]) => InventoryItemDto[],
): void {
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    client.setQueryData<InventoryItemDto[]>(key, updater(items));
  }
}

export function patchInventoryDetail(
  client: QueryClient,
  id: string,
  updater: (item: InventoryItemDto) => InventoryItemDto,
): void {
  client.setQueryData<InventoryItemDto>(inventoryKeys.detail(id), (item) =>
    item ? updater(item) : item,
  );
}

export function optimisticInventoryItem(input: InventoryInput): InventoryItemDto {
  const now = new Date().toISOString();
  return {
    ...input,
    expiresAt: input.expiresAt ?? estimatedExpiry(
      input.shelfLifeDays, input.storageLocation, new Date(input.preparedAt ?? now),
    )?.toISOString() ?? null,
    fiberPerUnit: input.fiberPerUnit ?? null,
    id: createOptimisticId(),
    userId: "",
    shelfLifeDays: input.shelfLifeDays ?? {},
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function insertOptimisticInventory(client: QueryClient, input: InventoryInput): InventoryItemDto {
  const item = optimisticInventoryItem(input);
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    const filters = (key[2] ?? {}) as InventoryListFilters;
    if (!matchesFilters(filters, item)) continue;
    client.setQueryData<InventoryItemDto[]>(key, [item, ...items]);
  }
  patchInventorySummary(client, (summary) => ({
    ...summary,
    totalItems: summary.totalItems + 1,
    totalQuantity: summary.totalQuantity + item.remainingQuantity,
    byLocation: addLocationQuantity(summary, item, 1),
  }));
  return item;
}

function addLocationQuantity(
  summary: InventorySummaryDto,
  item: InventoryItemDto,
  direction: 1 | -1,
): InventorySummaryDto["byLocation"] {
  const location = item.storageLocation;
  return {
    ...summary.byLocation,
    [location]: {
      items: summary.byLocation[location].items + direction,
      quantity: Math.max(0, summary.byLocation[location].quantity + direction * item.remainingQuantity),
    },
  };
}

export function patchInventorySummary(
  client: QueryClient,
  updater: (summary: InventorySummaryDto) => InventorySummaryDto,
): void {
  client.setQueryData<InventorySummaryDto>(inventoryKeys.summary(), (summary) =>
    summary ? updater(summary) : summary,
  );
}

export function replaceOptimisticInventory(
  client: QueryClient,
  optimisticId: string,
  item: InventoryItemDto,
): void {
  patchInventoryList(client, (items) => items.map((entry) =>
    entry.id === optimisticId ? item : entry,
  ));
  patchInventoryDetail(client, optimisticId, () => item);
  patchInventoryDetail(client, item.id, () => item);
}

export function adjustOptimisticInventory(
  client: QueryClient,
  id: string,
  delta: 1 | -1,
): void {
  patchInventoryList(client, (items) => items.flatMap((item) => {
    if (item.id !== id) return [item];
    const remainingQuantity = Math.max(0, item.remainingQuantity + delta);
    if (remainingQuantity === 0) return [];
    return [{ ...item, remainingQuantity }];
  }));
  patchInventoryDetail(client, id, (item) => ({
    ...item,
    remainingQuantity: Math.max(0, item.remainingQuantity + delta),
  }));
  patchInventorySummary(client, (summary) => ({
    ...summary,
    totalItems: summary.totalItems,
    totalQuantity: Math.max(0, summary.totalQuantity + delta),
  }));
}

export function removeOptimisticInventory(client: QueryClient, id: string): void {
  patchInventoryList(client, (items) => items.filter((item) => item.id !== id));
  client.removeQueries({ queryKey: inventoryKeys.detail(id) });
}

export function updateOptimisticInventory(
  client: QueryClient,
  id: string,
  input: InventoryUpdate,
): InventoryItemDto | undefined {
  let updated: InventoryItemDto | undefined;
  patchInventoryList(client, (items) => items.map((item) => {
    if (item.id !== id) return item;
    const next: InventoryItemDto = {
      ...item,
      ...input,
      tags: [],
      ...(input.fiberPerUnit === undefined ? {} : { fiberPerUnit: input.fiberPerUnit }),
    };
    updated = next;
    return next;
  }));
  if (updated) {
    const nextUpdated = updated;
    patchInventoryDetail(client, id, () => nextUpdated);
  }
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    const filters = (key[2] ?? {}) as InventoryListFilters;
    client.setQueryData<InventoryItemDto[]>(key, items.filter((item) => {
      if (item.id !== id) return true;
      return matchesFilters(filters, item);
    }));
  }
  return updated;
}

export function discardOptimisticInventory(client: QueryClient, id: string): void {
  patchInventoryList(client, (items) => items.filter((item) => item.id !== id));
  patchInventoryDetail(client, id, (item) => ({ ...item, status: "discarded" }));
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.expiring(48) })) {
    if (items) client.setQueryData<InventoryItemDto[]>(key, items.filter((item) => item.id !== id));
  }
  patchInventorySummary(client, (summary) => {
    const item = findInventoryItem(client, id);
    if (!item) return summary;
    return {
      ...summary,
      totalItems: Math.max(0, summary.totalItems - 1),
      totalQuantity: Math.max(0, summary.totalQuantity - item.remainingQuantity),
      byLocation: addLocationQuantity(summary, item, -1),
    };
  });
}

function findInventoryItem(client: QueryClient, id: string): InventoryItemDto | undefined {
  for (const [, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    const item = items?.find((entry) => entry.id === id);
    if (item) return item;
  }
  return client.getQueryData<InventoryItemDto>(inventoryKeys.detail(id));
}

export function consumeOptimisticInventory(
  client: QueryClient,
  id: string,
  input: ConsumeInventoryInput,
): { item: InventoryItemDto; log: MealLogDto } | undefined {
  const item = findInventoryItem(client, id);
  if (!item) return undefined;
  const remainingQuantity = Math.max(0, item.remainingQuantity - input.quantity);
  const updated = { ...item, remainingQuantity, status: remainingQuantity === 0 ? "consumed" as const : item.status };
  patchInventoryList(client, (items) => items.flatMap((entry) =>
    entry.id === id ? (remainingQuantity === 0 ? [] : [updated]) : [entry],
  ));
  patchInventoryDetail(client, id, () => updated);
  patchInventorySummary(client, (summary) => ({
    ...summary,
    totalItems: remainingQuantity === 0 ? Math.max(0, summary.totalItems - 1) : summary.totalItems,
    totalQuantity: Math.max(0, summary.totalQuantity - input.quantity),
  }));
  const eatenAt = input.eatenAt ?? new Date().toISOString();
  const log: MealLogDto = {
    id: createOptimisticId(),
    userId: "",
    inventoryItemId: id,
    recipeId: item.recipeId,
    name: item.name,
    mealType: input.mealType ?? null,
    quantity: input.quantity,
    unit: item.unit,
    calories: item.caloriesPerUnit === null ? null : item.caloriesPerUnit * input.quantity,
    proteinG: item.proteinPerUnit === null ? null : item.proteinPerUnit * input.quantity,
    carbsG: item.carbsPerUnit === null ? null : item.carbsPerUnit * input.quantity,
    fatG: item.fatPerUnit === null ? null : item.fatPerUnit * input.quantity,
    fiberG: item.fiberPerUnit === null ? null : item.fiberPerUnit * input.quantity,
    costAmount: item.costPerUnit === null ? null : item.costPerUnit * input.quantity,
    currency: item.currency,
    eatenAt,
    createdAt: eatenAt,
  };
  addOptimisticMealLog(client, log);
  return { item: updated, log };
}

function addOptimisticMealLog(client: QueryClient, log: MealLogDto): void {
  for (const [key, logs] of client.getQueriesData<MealLogDto[]>({ queryKey: ["meal-tracker", "logs"] })) {
    if (logs) client.setQueryData<MealLogDto[]>(key, [log, ...logs]);
  }
  for (const [key, summary] of client.getQueriesData<DailyMealSummaryDto>({ queryKey: ["meal-tracker", "summary"] })) {
    if (!summary) continue;
    client.setQueryData<DailyMealSummaryDto>(key, {
      ...summary,
      calories: summary.calories + (log.calories ?? 0),
      unknownCaloriesCount: summary.unknownCaloriesCount + (log.calories === null ? 1 : 0),
      proteinG: summary.proteinG + (log.proteinG ?? 0),
      unknownProteinCount: summary.unknownProteinCount + (log.proteinG === null ? 1 : 0),
      carbsG: summary.carbsG + (log.carbsG ?? 0),
      unknownCarbsCount: summary.unknownCarbsCount + (log.carbsG === null ? 1 : 0),
      fatG: summary.fatG + (log.fatG ?? 0),
      unknownFatCount: summary.unknownFatCount + (log.fatG === null ? 1 : 0),
      unknownFiberCount: summary.unknownFiberCount + (log.fiberG === null ? 1 : 0),
      fiberG: summary.fiberG + (log.fiberG ?? 0),
      costAmount: summary.costAmount + (log.costAmount ?? 0),
      mealCount: summary.mealCount + 1,
    });
  }
}

export function replaceOptimisticMealLog(
  client: QueryClient,
  optimisticId: string,
  log: MealLogDto,
): void {
  for (const [key, logs] of client.getQueriesData<MealLogDto[]>({ queryKey: ["meal-tracker", "logs"] })) {
    if (!logs) continue;
    client.setQueryData<MealLogDto[]>(key, logs.map((entry) =>
      entry.id === optimisticId ? log : entry,
    ));
  }
}
