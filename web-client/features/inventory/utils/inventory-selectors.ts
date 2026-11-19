import type { InventoryItem, Storage } from "../types";
import { daysUntil } from "./inventory-formatters";

export type StorageFilter = "all" | Storage;

export function inventoryCounts(items: readonly InventoryItem[]): Record<StorageFilter, number> {
  return items.reduce((counts, item) => {
    counts.all += item.portions;
    counts[item.storage] += item.portions;
    return counts;
  }, { all: 0, fridge: 0, freezer: 0 });
}

export function filterInventory(items: readonly InventoryItem[], filter: StorageFilter, search: string): InventoryItem[] {
  const needle = search.trim().toLocaleLowerCase();
  return items.filter((item) =>
    (filter === "all" || item.storage === filter) &&
    `${item.name} ${item.location}`.toLocaleLowerCase().includes(needle),
  );
}

export function rescueItems(items: readonly InventoryItem[], asOf: string): InventoryItem[] {
  return items.filter((item) => {
    const days = daysUntil(item.bestBefore, asOf);
    return days >= 0 && days <= 2;
  });
}
