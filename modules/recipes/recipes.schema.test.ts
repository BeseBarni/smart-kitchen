import assert from "node:assert/strict";
import { test } from "node:test";
import { createRecipeSchema } from "./recipes.schema";

test("recipe creation accepts ingredients without server-generated identifiers", () => {
  const result = createRecipeSchema.safeParse({
    title: "Tomato soup",
    description: null,
    instructions: ["Cook the tomatoes."],
    imageUrl: null,
    prepTimeMin: null,
    cookTimeMin: null,
    servings: 2,
    isFreezerFriendly: false,
    source: "manual",
    ingredients: [
      {
        ingredientId: null,
        displayName: "Tomatoes",
        quantity: 3,
        unit: "pcs",
        notes: null,
        sortOrder: 0,
      },
    ],
    caloriesPerServing: null,
    proteinPerServing: null,
    carbsPerServing: null,
    fatPerServing: null,
    costPerServing: null,
    currency: "HUF",
  });

  assert.equal(result.success, true);
});
