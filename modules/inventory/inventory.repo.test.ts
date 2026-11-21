import assert from "node:assert/strict";
import test from "node:test";
import { batchInventoryValues } from "./inventory.repo";
import { batchCreateInventoryInputSchema } from "./inventory.schema";

test("batch inserts preserve per-unit macros, zeros, and unknown values", () => {
  const item = {
    name: "Apples", quantity: 500, unit: "g", storageLocation: "fridge" as const,
    estimatedMacrosPerUnit: { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null },
  };
  const parsed = batchCreateInventoryInputSchema.parse({ items: [item] }).items[0]!;
  const values = batchInventoryValues("user-1", parsed);
  assert.deepEqual(
    [values.caloriesPerUnit, values.proteinPerUnit, values.carbsPerUnit, values.fatPerUnit, values.fiberPerUnit],
    ["0.52", "0.003", "0.14", "0", null],
  );
  const oldItem = batchInventoryValues("user-1", { name: "Milk", quantity: 1, unit: "l", storageLocation: "fridge" });
  assert.equal(oldItem.caloriesPerUnit, null);
});
