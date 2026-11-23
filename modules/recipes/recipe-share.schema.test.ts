import assert from "node:assert/strict";
import { test } from "node:test";
import {
  shareTokenParamSchema,
  sharedRecipePublicDtoSchema,
} from "./recipe-share.schema";

const publicRecipe = {
  title: "Green lentil soup",
  description: null,
  instructions: ["Simmer until tender."],
  prepTimeMin: 10,
  cookTimeMin: 25,
  servings: 4,
  calories: 280,
  proteinG: 18,
  carbsG: 35,
  fatG: 7,
  shelfLifeDays: { fridge: 3, freezer: 30 },
  tags: [{
    slug: "vegetarian",
    label: "Vegetarian",
    i18nKey: "tags.vegetarian",
    category: "dietary" as const,
    colorToken: "green",
  }],
  ingredients: [{
    displayName: "Green lentils",
    quantity: 200,
    unit: "g",
    notes: null,
    sortOrder: 0,
  }],
  imageUrls: { small: null, medium: null, large: null, source: "none" as const },
  sharedAt: "2026-01-01T00:00:00.000Z",
};

test("accepts only canonical 128-bit URL-safe share tokens", () => {
  assert.equal(shareTokenParamSchema.safeParse({ token: "A".repeat(22) }).success, true);
  assert.equal(shareTokenParamSchema.safeParse({ token: "A".repeat(21) + "B" }).success, false);
  assert.equal(shareTokenParamSchema.safeParse({ token: "A".repeat(23) }).success, false);
  assert.equal(shareTokenParamSchema.safeParse({ token: "A".repeat(21) + "/" }).success, false);
});

test("public recipe DTO rejects private or unrecognized fields", () => {
  assert.equal(sharedRecipePublicDtoSchema.safeParse(publicRecipe).success, true);
  assert.equal(
    sharedRecipePublicDtoSchema.safeParse({ ...publicRecipe, userId: "private-owner-id" }).success,
    false,
  );
  assert.equal(
    sharedRecipePublicDtoSchema.safeParse({
      ...publicRecipe,
      ingredients: [{ ...publicRecipe.ingredients[0], priceAmount: 12 }],
    }).success,
    false,
  );
});
