import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { inventoryDetailSchema } from "./inventory.schema";

test("linked recipe details satisfy the inventory detail contract", async () => {
  const db = await import("@app/db");
  const recipeId = "00000000-0000-4000-8000-000000000001";
  const itemId = "00000000-0000-4000-8000-000000000002";
  const assetId = "00000000-0000-4000-8000-000000000003";
  const recipe = { id: recipeId, title: "Soup", description: null, prepTimeMin: 5, cookTimeMin: 10, servings: "2" };
  const line = { displayName: "Beans", quantity: "100", unit: "g", notes: null, ingredientId: null, sortOrder: 0 };
  const mockDb = mock.module("@app/db", {
    namedExports: {
      ...db,
      getDatabase: () => ({
        select: (selection: Record<string, unknown>) => ({
          from: () => ({
            where: () => ({
              limit: async () => [recipe],
              orderBy: async () => [Object.fromEntries(
                Object.keys(selection).map((key) => [key, line[key as keyof typeof line]]),
              )],
            }),
          }),
        }),
      }),
    },
  });
  try {
    const { findLinkedRecipe } = await import("./inventory.repo");
    const linked = await findLinkedRecipe("owner", recipeId);
    assert.deepEqual(linked?.ingredients, [
      { displayName: "Beans", quantity: 100, unit: "g", notes: null, ingredientId: null },
    ]);
    const imageUrl = `/api/media/${assetId}/file`;
    const detail = {
      id: itemId, userId: "owner", name: "Soup", itemType: "meal_prep", recipeId,
      ingredientId: null, storageLocation: "fridge", status: "in_stock",
      initialQuantity: 2, remainingQuantity: 2, unit: "portion",
      preparedAt: null, expiresAt: null, imageUrl, imageAssetId: assetId,
      imageUrls: { small: imageUrl, medium: imageUrl, large: imageUrl, source: "upload" },
      caloriesPerUnit: 320.5, proteinPerUnit: 15, carbsPerUnit: 40, fatPerUnit: 5,
      fiberPerUnit: 8, costPerUnit: null, currency: "USD",
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      freshness: { msRemaining: null, daysRemaining: null, isExpired: false, shelfLifeDaysForCurrentLocation: null },
      recipe: linked,
    };
    assert.equal(inventoryDetailSchema.safeParse(detail).success, true);
    assert.equal(inventoryDetailSchema.safeParse({
      ...detail, recipe: { ...linked, ingredients: [{ ...linked?.ingredients[0], sortOrder: 0 }] },
    }).success, false);
    assert.equal(inventoryDetailSchema.safeParse({ ...detail, imageUrl: "/api/media/other/file" }).success, false);
  } finally {
    mockDb.restore();
  }
});
