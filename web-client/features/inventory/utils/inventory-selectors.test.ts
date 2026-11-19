import assert from "node:assert/strict";
import test from "node:test";
import type { InventoryItem } from "../types";
import { addDays, addMonths, daysUntil, freshnessLabel } from "./inventory-formatters";
import { filterInventory, inventoryCounts, rescueItems } from "./inventory-selectors";

const items: InventoryItem[] = [
  { id: "1", name: "Soup", storage: "fridge", portions: 2, bestBefore: "2026-03-01", container: "glass", location: "Top shelf" },
  { id: "2", name: "Chili", storage: "freezer", portions: 3, bestBefore: "2026-03-03", container: "bag", location: "Drawer" },
  { id: "3", name: "Rice", storage: "fridge", portions: 1, bestBefore: "2026-02-28", container: "box", location: "" },
];

test("counts and searches use portions and combine storage with case-insensitive search", () => {
  assert.deepEqual(inventoryCounts(items), { all: 6, fridge: 3, freezer: 3 });
  assert.deepEqual(filterInventory(items, "fridge", "SHELF").map((item) => item.id), ["1"]);
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
