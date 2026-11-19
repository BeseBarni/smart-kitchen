import type { InventoryInput, InventoryItem, PortionAdjustment } from "../types";
import { inventoryFormSchema } from "../utils/inventory-form.schema";
import { addDays, addMonths, todayLocal } from "../utils/inventory-formatters";

function initialItems(): InventoryItem[] {
  const today = todayLocal();
  return [
  { id: "gyros-fridge", name: "Gyros Chicken", storage: "fridge", portions: 2, bestBefore: addDays(today, 2), location: "Shelf 1", container: "glass" },
  { id: "gyros-freezer", name: "Gyros Chicken", storage: "freezer", portions: 4, bestBefore: addMonths(today, 3), location: "Chest Freezer", container: "bag" },
  { id: "gnocchi", name: "Pesto Rosso Gnocchi", storage: "fridge", portions: 1, bestBefore: addDays(today, 1), location: "Top Shelf", container: "box" },
  { id: "chili", name: "Slow Cooker Beef Chili", storage: "freezer", portions: 3, bestBefore: addMonths(today, 2), location: "Chest Freezer", container: "glass" },
  { id: "tortillas", name: "Homemade Flour Tortillas", storage: "freezer", portions: 2, bestBefore: addMonths(today, 1), location: "Drawer B", container: "bag" },
  ];
}

let items: InventoryItem[] | undefined;

function currentItems(): InventoryItem[] {
  if (!items) items = initialItems();
  return items;
}

export async function listInventory(): Promise<InventoryItem[]> {
  return structuredClone(currentItems());
}

export async function createInventory(input: InventoryInput): Promise<InventoryItem> {
  const parsed = inventoryFormSchema.parse(input);
  const item: InventoryItem = { ...parsed, id: crypto.randomUUID() };
  items = [...currentItems(), item];
  return structuredClone(item);
}

export async function updateInventory(id: string, input: InventoryInput): Promise<InventoryItem> {
  const parsed = inventoryFormSchema.parse(input);
  if (!currentItems().some((item) => item.id === id)) throw new Error("Inventory item not found.");
  const updated = { id, ...parsed };
  items = currentItems().map((item) => item.id === id ? updated : item);
  return structuredClone(updated);
}

export async function adjustPortions({ id, delta }: PortionAdjustment): Promise<void> {
  if (delta !== 1 && delta !== -1) throw new Error("Invalid portion adjustment.");
  const item = currentItems().find((entry) => entry.id === id);
  if (!item) throw new Error("Inventory item not found.");
  const portions = item.portions + delta;
  if (!Number.isSafeInteger(portions)) throw new Error("Portion count is too large.");
  items = portions === 0 ? currentItems().filter((entry) => entry.id !== id) :
    currentItems().map((entry) => entry.id === id ? { ...entry, portions } : entry);
}
