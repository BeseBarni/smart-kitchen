import assert from "node:assert/strict";
import test from "node:test";
import type { InventoryItem, Storage } from "../types";
import { addDays, addMonths, daysUntil, freshnessLabel } from "./inventory-formatters";
import { filterInventory, inventoryCounts, rescueItems } from "./inventory-selectors";

function item(id: string, name: string, storageLocation: Storage, remainingQuantity: number, expiresAt: string): InventoryItem {
  return {
    id,
    userId: "user-1",
    name,
    itemType: "meal_prep",
    recipeId: null,
    ingredientId: null,
    storageLocation,
    status: "in_stock",
    initialQuantity: remainingQuantity,
    remainingQuantity,
    unit: "portion",
    preparedAt: null,
    expiresAt,
    imageUrl: null,
    caloriesPerUnit: null,
    proteinPerUnit: null,
    carbsPerUnit: null,
    fatPerUnit: null,
    fiberPerUnit: null,
    costPerUnit: null,
    currency: "HUF",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

const items: InventoryItem[] = [
  item("1", "Soup", "fridge", 2, "2026-03-01T23:59:59.999Z"),
  item("2", "Chili", "freezer", 3, "2026-03-03T23:59:59.999Z"),
  item("3", "Rice", "fridge", 1, "2026-02-28T23:59:59.999Z"),
];

test("counts and searches use portions and combine storage with case-insensitive search", () => {
  assert.deepEqual(inventoryCounts(items), { all: 6, fridge: 3, freezer: 3, pantry: 0 });
  assert.deepEqual(filterInventory(items, "fridge", "SOUP").map((item) => item.id), ["1"]);
  assert.deepEqual(filterInventory(items, "freezer", "soup"), []);
});

test("freshness uses calendar dates and excludes expired items from rescue", () => {
  assert.deepEqual(rescueItems(items, "2026-03-01").map((item) => item.id), ["1", "2"]);
  assert.equal(daysUntil("2026-02-28", "2026-03-01"), -1);
  assert.equal(freshnessLabel(-1), "Expired 1 day ago");
  assert.equal(freshnessLabel(0), "Expires today");
  assert.equal(freshnessLabel(1), "Expires tomorrow");
  assert.throws(() => daysUntil("2026-02-30", "2026-03-01"), /Invalid/);
});

test("date presets handle leap days and clamp month ends", () => {
  assert.equal(addDays("2024-02-28", 2), "2024-03-01");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2026-11-30", 3), "2027-02-28");
});
