import assert from "node:assert/strict";
import { test } from "node:test";
import type { IngredientDto } from "../ingredients/ingredients.schema";
import type { CreateRecipeInput } from "./recipes.schema";
import { calculateRecipeValues, withRecipeOverrides } from "./recipes.mapper";

const ingredient: IngredientDto = {
  id: "10000000-0000-4000-8000-000000000001",
  userId: "user-1",
  name: "Beans",
  brand: null,
  category: null,
  imageUrl: null,
  defaultUnit: "g",
  baseQuantity: 100,
  calories: 200,
  proteinG: 20,
  carbsG: 30,
  fatG: 4,
  fiberG: 8,
  priceAmount: 200,
  priceQuantity: 100,
  priceUnit: "g",
  currency: "HUF",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("derives per-serving values for matching units", () => {
  const result = calculateRecipeValues(
    [{
      displayName: "Beans",
      ingredientId: ingredient.id,
      quantity: 50,
      unit: "g",
      notes: null,
      sortOrder: 0,
    }],
    new Map([[ingredient.id, ingredient]]),
    2,
  );
  assert.deepEqual(result, {
    caloriesPerServing: 50,
    proteinPerServing: 5,
    carbsPerServing: 7.5,
    fatPerServing: 1,
    costPerServing: 50,
  });
});

test("does not guess conversions for mismatched units", () => {
  const result = calculateRecipeValues(
    [{
      displayName: "Beans",
      ingredientId: ingredient.id,
      quantity: 50,
      unit: "ml",
      notes: null,
      sortOrder: 0,
    }],
    new Map([[ingredient.id, ingredient]]),
    1,
  );
  assert.equal(result.caloriesPerServing, null);
  assert.equal(result.costPerServing, null);
});

test("keeps explicit non-null recipe values and derives unset values", () => {
  const input: CreateRecipeInput = {
    title: "Beans",
    description: null,
    instructions: [],
    imageUrl: null,
    prepTimeMin: null,
    cookTimeMin: null,
    servings: 2,
    isFreezerFriendly: false,
    source: "manual",
    ingredients: [],
    caloriesPerServing: 123,
    proteinPerServing: null,
    carbsPerServing: undefined,
    fatPerServing: null,
    costPerServing: undefined,
    currency: "HUF",
  };
  const values = withRecipeOverrides(input, {
    caloriesPerServing: 50,
    proteinPerServing: 5,
    carbsPerServing: 7,
    fatPerServing: 1,
    costPerServing: 50,
  });
  assert.equal(values.caloriesPerServing, 123);
  assert.equal(values.proteinPerServing, 5);
  assert.equal(values.carbsPerServing, 7);
});
