import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("consumption calls the atomic service without requiring unknown fiber", async () => {
  const modules = await import("@app/modules");
  const calls: unknown[] = [];
  const id = "00000000-0000-4000-8000-000000000001";
  const time = "2026-01-01T10:00:00.000Z";
  let insufficient = false;
  const service = {
    ...modules.inventoryService,
    consumePortion: async (...args: Parameters<typeof modules.inventoryService.consumePortion>) => {
      calls.push(args);
      if (insufficient) return { success: false as const, error: { code: "INSUFFICIENT_QUANTITY" as const, message: "Not enough stock." } };
      return {
        success: true as const,
        data: {
          updatedItem: {
            id, userId: "user-1", name: "Apple", itemType: "ingredient" as const, recipeId: null, ingredientId: null,
            storageLocation: "fridge" as const, status: "in_stock" as const, initialQuantity: 3, remainingQuantity: 1,
            unit: "piece", preparedAt: null, expiresAt: null, imageUrl: null, caloriesPerUnit: 50, proteinPerUnit: null,
            carbsPerUnit: null, fatPerUnit: null, fiberPerUnit: null, costPerUnit: null, currency: "USD",
            createdAt: time, updatedAt: time,
          },
          mealLog: {
            id, userId: "user-1", inventoryItemId: id, recipeId: null, name: "Apple", mealType: null,
            quantity: 2, unit: "piece", calories: 100, proteinG: null, carbsG: null, fatG: null,
            fiberG: null, costAmount: null, currency: "USD", eatenAt: time, createdAt: time,
          },
        },
      };
    },
  };
  const moduleMock = mock.module("@app/modules", {
    namedExports: { ...modules, inventoryService: service },
  });
  try {
    const { inventoryConsumeTool } = await import("./inventory.write.tools");
    const context = { userId: "user-1", agent: "inventory_ops" as const, emit: () => {}, recordLedger: async () => {} };
    const result = await inventoryConsumeTool.execute({ itemId: id, quantity: 2 }, context);
    assert.deepEqual(calls, [["user-1", id, { quantity: 2 }]]);
    assert.equal(result.success, true);
    if (result.success) {
      const card = inventoryConsumeTool.toUiDirective?.(result.data);
      assert.equal(card?.component, "consumption_summary_card");
      if (card?.component === "consumption_summary_card") assert.equal(card.loggedMeal.fiberG, null);
    }
    assert.deepEqual(inventoryConsumeTool.invalidateDomains, ["inventory", "meal-logs"]);
    insufficient = true;
    const failed = await inventoryConsumeTool.execute({ itemId: id, quantity: 2 }, context);
    assert.deepEqual(failed, { success: false, error: { code: "INSUFFICIENT_QUANTITY", message: "Not enough stock." } });
  } finally {
    moduleMock.restore();
  }
});
