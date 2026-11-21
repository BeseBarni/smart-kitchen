import type {
  CreateMealLogInput,
  MealLogDto,
  ProfileDto,
  UpdateProfileInput,
  InventoryItemDto,
  InventorySummaryDto,
} from "@app/modules/schemas";
import { dailyMealSummarySchema } from "@app/modules/schemas";
import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/features/inventory";
import { createOptimisticId } from "@/lib/optimistic";
import { mealTrackerKeys } from "../api/meal-tracker.keys";

type DailyMealSummaryDto = z.infer<typeof dailyMealSummarySchema>;

export function insertOptimisticMealLog(
  client: QueryClient,
  input: CreateMealLogInput,
): MealLogDto {
  const log: MealLogDto = {
    ...input,
    fiberG: input.fiberG ?? null,
    id: createOptimisticId(),
    userId: "",
    createdAt: new Date().toISOString(),
  };
  for (const [key, logs] of client.getQueriesData<MealLogDto[]>({ queryKey: ["meal-tracker", "logs"] })) {
    if (logs) client.setQueryData<MealLogDto[]>(key, [log, ...logs]);
  }
  patchDailySummary(client, (summary) => addMealToSummary(summary, log));
  return log;
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

export function removeOptimisticMealLog(
  client: QueryClient,
  id: string,
  restoreInventory: boolean,
): MealLogDto | undefined {
  let removed: MealLogDto | undefined;
  for (const [key, logs] of client.getQueriesData<MealLogDto[]>({ queryKey: ["meal-tracker", "logs"] })) {
    if (!logs) continue;
    const entry = logs.find((log) => log.id === id);
    if (entry) removed = entry;
    client.setQueryData<MealLogDto[]>(key, logs.filter((log) => log.id !== id));
  }
  if (removed) patchDailySummary(client, (summary) => subtractMealFromSummary(summary, removed as MealLogDto));
  if (removed?.inventoryItemId && restoreInventory) restoreInventoryQuantity(client, removed);
  return removed;
}

function patchDailySummary(
  client: QueryClient,
  updater: (summary: DailyMealSummaryDto) => DailyMealSummaryDto,
): void {
  for (const [key, summary] of client.getQueriesData<DailyMealSummaryDto>({
    queryKey: ["meal-tracker", "summary"],
  })) {
    if (summary) client.setQueryData<DailyMealSummaryDto>(key, updater(summary));
  }
}

function addMealToSummary(
  summary: DailyMealSummaryDto,
  log: MealLogDto,
): DailyMealSummaryDto {
  return {
    ...summary,
    calories: summary.calories + (log.calories ?? 0),
    unknownCaloriesCount: summary.unknownCaloriesCount + (log.calories === null ? 1 : 0),
    proteinG: summary.proteinG + (log.proteinG ?? 0),
    unknownProteinCount: summary.unknownProteinCount + (log.proteinG === null ? 1 : 0),
    carbsG: summary.carbsG + (log.carbsG ?? 0),
    unknownCarbsCount: summary.unknownCarbsCount + (log.carbsG === null ? 1 : 0),
    fatG: summary.fatG + (log.fatG ?? 0),
    unknownFatCount: summary.unknownFatCount + (log.fatG === null ? 1 : 0),
    fiberG: summary.fiberG + (log.fiberG ?? 0),
    unknownFiberCount: summary.unknownFiberCount + (log.fiberG === null ? 1 : 0),
    costAmount: summary.costAmount + (log.costAmount ?? 0),
    mealCount: summary.mealCount + 1,
  };
}

function subtractMealFromSummary(
  summary: DailyMealSummaryDto,
  log: MealLogDto,
): DailyMealSummaryDto {
  return {
    ...summary,
    calories: Math.max(0, summary.calories - (log.calories ?? 0)),
    unknownCaloriesCount: Math.max(0, summary.unknownCaloriesCount - (log.calories === null ? 1 : 0)),
    proteinG: Math.max(0, summary.proteinG - (log.proteinG ?? 0)),
    unknownProteinCount: Math.max(0, summary.unknownProteinCount - (log.proteinG === null ? 1 : 0)),
    carbsG: Math.max(0, summary.carbsG - (log.carbsG ?? 0)),
    unknownCarbsCount: Math.max(0, summary.unknownCarbsCount - (log.carbsG === null ? 1 : 0)),
    fatG: Math.max(0, summary.fatG - (log.fatG ?? 0)),
    unknownFatCount: Math.max(0, summary.unknownFatCount - (log.fatG === null ? 1 : 0)),
    fiberG: Math.max(0, summary.fiberG - (log.fiberG ?? 0)),
    unknownFiberCount: Math.max(0, summary.unknownFiberCount - (log.fiberG === null ? 1 : 0)),
    costAmount: Math.max(0, summary.costAmount - (log.costAmount ?? 0)),
    mealCount: Math.max(0, summary.mealCount - 1),
  };
}

function restoreInventoryQuantity(client: QueryClient, log: MealLogDto): void {
  const id = log.inventoryItemId;
  if (!id) return;
  const detail = client.getQueryData<InventoryItemDto>(inventoryKeys.detail(id));
  const restored = detail
    ? { ...detail, remainingQuantity: detail.remainingQuantity + log.quantity, status: "in_stock" as const }
    : undefined;
  for (const [key, items] of client.getQueriesData<InventoryItemDto[]>({ queryKey: inventoryKeys.lists() })) {
    if (!items) continue;
    const existing = items.map((item) =>
      item.id === id ? {
        ...item,
        remainingQuantity: item.remainingQuantity + log.quantity,
        status: "in_stock" as const,
      } : item,
    );
    const filters = (key[2] ?? {}) as { storageLocation?: InventoryItemDto["storageLocation"]; status?: InventoryItemDto["status"]; search?: string };
    if (restored && !existing.some((item) => item.id === id) &&
      (!filters.status || filters.status === "in_stock") &&
      (!filters.storageLocation || filters.storageLocation === restored.storageLocation) &&
      (!filters.search || restored.name.toLowerCase().includes(filters.search.toLowerCase()))) {
      existing.unshift(restored);
    }
    client.setQueryData<InventoryItemDto[]>(key, existing);
  }
  client.setQueryData<InventoryItemDto>(inventoryKeys.detail(id), (item) =>
    item ? { ...item, remainingQuantity: item.remainingQuantity + log.quantity, status: "in_stock" } : item,
  );
  client.setQueryData<InventorySummaryDto>(inventoryKeys.summary(), (summary) => {
    if (!summary || !restored) return summary;
    const location = summary.byLocation[restored.storageLocation];
    return {
      ...summary,
      totalItems: summary.totalItems + 1,
      totalQuantity: summary.totalQuantity + log.quantity,
      byLocation: {
        ...summary.byLocation,
        [restored.storageLocation]: {
          items: location.items + 1,
          quantity: location.quantity + log.quantity,
        },
      },
    };
  });
}

export function patchOptimisticProfile(
  client: QueryClient,
  input: UpdateProfileInput,
): void {
  for (const [key, profile] of client.getQueriesData<ProfileDto>({
    queryKey: mealTrackerKeys.profile(),
  })) {
    if (profile) client.setQueryData<ProfileDto>(key, { ...profile, ...input });
  }
  client.setQueryData<ProfileDto>(["profile"], (profile) =>
    profile ? { ...profile, ...input } : profile,
  );
}
