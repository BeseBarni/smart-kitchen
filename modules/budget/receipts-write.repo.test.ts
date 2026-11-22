import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "@app/db";
import type { BudgetTransaction } from "./budget.transaction";
import { insertScannedInventoryRows } from "./receipts-write.repo";

test("scanned inventory writes per-unit estimates including zero and unknown values", async () => {
  const inserts: Array<Record<string, unknown>> = [];
  const tx: BudgetTransaction = Object.create(db);
  Object.defineProperty(tx, "insert", {
    value: () => ({
      values: (values: Record<string, unknown>) => {
        inserts.push(values);
        return { returning: async () => [{ id: `item-${inserts.length}` }] };
      },
    }),
  });
  const base = {
    name: "Apple", categoryId: "category", amount: 10, quantity: 500, unit: "g",
    addToInventory: true, storageLocation: "fridge" as const,
  };
  const result = await insertScannedInventoryRows("owner", tx, "HUF", [
    { ...base, estimatedMacrosPerUnit: { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null } },
    { ...base, estimatedMacrosPerUnit: null },
    { ...base, addToInventory: false },
  ]);
  assert.equal(result.success, true);
  assert.equal(inserts.length, 2);
  assert.deepEqual(
    inserts.map(({ caloriesPerUnit, proteinPerUnit, carbsPerUnit, fatPerUnit, fiberPerUnit }) =>
      [caloriesPerUnit, proteinPerUnit, carbsPerUnit, fatPerUnit, fiberPerUnit]),
    [["0.52", "0.003", "0.14", "0", null], [null, null, null, null, null]],
  );
});
