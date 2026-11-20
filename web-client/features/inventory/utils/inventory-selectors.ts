import type { InventoryItem, Storage } from "../types";
import { daysUntil } from "./inventory-formatters";

export type StorageFilter = "all" | Storage;

export function inventoryCounts(items: readonly InventoryItem[]): Record<StorageFilter, number> {
  return items.reduce((counts, item) => {
    counts.all += item.remainingQuantity;
    counts[item.storageLocation] += item.remainingQuantity;
    return counts;
  }, { all: 0, fridge: 0, freezer: 0, pantry: 0 });
}

export function filterInventory(items: readonly InventoryItem[], filter: StorageFilter, search: string): InventoryItem[] {
  const needle = search.trim().toLocaleLowerCase();
  return items.filter((item) =>
    (filter === "all" || item.storageLocation === filter) &&
    `${item.name} ${item.storageLocation}`.toLocaleLowerCase().includes(needle),
  );
}

export function rescueItems(items: readonly InventoryItem[], asOf: string): InventoryItem[] {
  return items.filter((item) => {
    if (!item.expiresAt) return false;
    const days = daysUntil(item.expiresAt.slice(0, 10), asOf);
    return days >= 0 && days <= 2;
  });
}
