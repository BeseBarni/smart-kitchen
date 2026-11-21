import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("consumption deducts stock and snapshots per-unit nutrition in the meal log", async () => {
  const db = await import("@app/db");
  let stock = {
    id: "item-1", userId: "user-1", name: "Apple", status: "in_stock",
    remainingQuantity: "500", unit: "g", recipeId: null, currency: "USD",
    caloriesPerUnit: "0.5200", proteinPerUnit: "0.0030", carbsPerUnit: "0.1400",
    fatPerUnit: "0.0000", fiberPerUnit: null, costPerUnit: null,
  };
  let mealValues: Record<string, unknown> | undefined;
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: () => ({ limit: async () => [stock] }) }) }) }),
    update: () => ({ set: (values: Partial<typeof stock>) => ({
      where: () => ({ returning: async () => { stock = { ...stock, ...values }; return [stock]; } }),
    }) }),
    insert: () => ({ values: (values: Record<string, unknown>) => ({
      returning: async () => { mealValues = values; return [values]; },
    }) }),
  };
  const moduleMock = mock.module("@app/db", {
    namedExports: { ...db, getDatabase: () => ({ transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) }) },
  });
  try {
    const { consumeInventoryRow } = await import("./inventory-consumption.repo");
    const result = await consumeInventoryRow("user-1", "item-1", { quantity: 100 });
    assert.equal(result.kind, "consumed");
    assert.equal(stock.remainingQuantity, "400");
    assert.equal(mealValues?.calories, "52");
    assert.equal(mealValues?.proteinG, "0.3");
    assert.equal(mealValues?.fiberG, null);
    mealValues = undefined;
    assert.equal((await consumeInventoryRow("user-1", "item-1", { quantity: 500 })).kind, "insufficient");
    assert.equal(stock.remainingQuantity, "400");
    assert.equal(mealValues, undefined);
  } finally {
    moduleMock.restore();
  }
});
