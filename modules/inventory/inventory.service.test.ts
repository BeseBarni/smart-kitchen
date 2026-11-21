import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { BatchCreateInventoryInput, CreateInventoryItemInput } from "./inventory.schema";

test("inventory creation derives expiry from shelf life while preserving known dates", async () => {
  const repo = await import("./inventory.repo");
  let single: CreateInventoryItemInput | undefined;
  let batch: BatchCreateInventoryInput | undefined;
  const date = new Date("2026-01-01T00:00:00.000Z");
  const row = {
    id: "item", initialQuantity: "1", remainingQuantity: "1",
    caloriesPerUnit: null, proteinPerUnit: null, carbsPerUnit: null, fatPerUnit: null,
    fiberPerUnit: null, costPerUnit: null, preparedAt: date, expiresAt: date,
    createdAt: date, updatedAt: date, shelfLifeDays: {},
  };
  const repoMock = mock.module("./inventory.repo", {
    namedExports: {
      ...repo,
      insertInventoryItem: async (_userId: string, input: CreateInventoryItemInput) => { single = input; return row; },
      insertInventoryBatch: async (_userId: string, input: BatchCreateInventoryInput) => { batch = input; return input.items.map(() => row); },
      replaceInventoryItemTags: async () => {},
    },
  });
  const userMock = mock.module("../shared/user.service", {
    namedExports: { requireAuthUser: async () => ({ success: true, data: undefined }) },
  });
  try {
    const service = await import("./inventory.service");
    const input: CreateInventoryItemInput = {
      name: "Soup", itemType: "meal_prep", recipeId: null, ingredientId: null,
      storageLocation: "fridge", status: "in_stock", initialQuantity: 1, remainingQuantity: 1,
      unit: "portion", preparedAt: date.toISOString(), expiresAt: null, imageUrl: null,
      caloriesPerUnit: null, proteinPerUnit: null, carbsPerUnit: null, fatPerUnit: null,
      costPerUnit: null, currency: "USD", shelfLifeDays: { fridge: 3, freezer: 90, pantry: null },
    };
    assert.equal((await service.create("user", input)).success, true);
    assert.equal(single?.expiresAt, "2026-01-04T00:00:00.000Z");
    await service.create("user", { ...input, expiresAt: "2026-01-02T00:00:00.000Z" });
    assert.equal(single?.expiresAt, "2026-01-02T00:00:00.000Z");
    await service.create("user", { ...input, storageLocation: "pantry" });
    assert.equal(single?.expiresAt, null);

    const before = Date.now();
    assert.equal((await service.createBatch("user", { items: [
      { name: "Apple", quantity: 1, unit: "pcs", storageLocation: "fridge", shelfLifeDays: { fridge: 7 } },
      { name: "Milk", quantity: 1, unit: "l", storageLocation: "fridge", expiresAt: date.toISOString(), shelfLifeDays: { fridge: 7 } },
      { name: "Soup", quantity: 1, unit: "portion", storageLocation: "pantry", shelfLifeDays: { pantry: null } },
    ] })).success, true);
    const after = Date.now();
    const expiry = Date.parse(batch?.items[0]?.expiresAt ?? "");
    assert.ok(expiry >= before + 7 * 86_400_000 && expiry <= after + 7 * 86_400_000);
    assert.equal(batch?.items[1]?.expiresAt, date.toISOString());
    assert.equal(batch?.items[2]?.expiresAt, null);
  } finally {
    userMock.restore();
    repoMock.restore();
  }
});
