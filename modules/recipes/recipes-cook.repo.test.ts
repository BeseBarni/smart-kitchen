import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("cooked batches use recipe shelf life from preparation time unless an expiry is supplied", async () => {
  const db = await import("@app/db");
  let inserted: Array<{ expiresAt: Date | null; shelfLifeDays: unknown; caloriesPerUnit: string | null }> = [];
  const recipe = {
    title: "Soup", shelfLifeDays: { fridge: 3, freezer: 90, pantry: null },
    imageUrl: null, caloriesPerServing: "320.5000" as string | null, proteinPerServing: null, carbsPerServing: null,
    fatPerServing: null, fiberPerServing: null, costPerServing: null, currency: "USD",
  };
  const tx = {
    select: () => ({ from: () => ({ where: () => ({
      for: () => ({ limit: async () => [recipe] }),
      then: (resolve: (value: never[]) => void) => resolve([]),
    }) }) }),
    insert: () => ({ values: (values: typeof inserted) => ({
      returning: async () => { inserted = values; return values; },
    }) }),
  };
  const moduleMock = mock.module("@app/db", {
    namedExports: { ...db, getDatabase: () => ({ transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) }) },
  });
  try {
    const { cookRecipeRows } = await import("./recipes-cook.repo");
    await cookRecipeRows("user", "recipe", [
      { storageLocation: "fridge", quantity: 1 },
      { storageLocation: "freezer", quantity: 1, expiresAt: "2026-02-01T00:00:00.000Z" },
      { storageLocation: "pantry", quantity: 1 },
    ], "2026-01-01T00:00:00.000Z");
    assert.deepEqual(inserted.map((row) => row.expiresAt?.toISOString() ?? null), [
      "2026-01-04T00:00:00.000Z", "2026-02-01T00:00:00.000Z", null,
    ]);
    assert.deepEqual(inserted[0]?.shelfLifeDays, recipe.shelfLifeDays);
    assert.deepEqual(inserted.map((row) => row.caloriesPerUnit), ["320.5000", "320.5000", "320.5000"]);
    recipe.caloriesPerServing = null;
    await cookRecipeRows("user", "recipe", [{ storageLocation: "fridge", quantity: 1 }]);
    assert.equal(inserted[0]?.caloriesPerUnit, null);
  } finally {
    moduleMock.restore();
  }
});
