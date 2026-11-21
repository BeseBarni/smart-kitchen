import assert from "node:assert/strict";
import test from "node:test";
import type { Recipe } from "../types";
import { filterRecipes, recipeCounts } from "./recipes-selectors";

function recipe(id: string, title: string, source: "manual" | "ai_skill", prepTimeMin: number, isFreezerFriendly: boolean, displayName: string): Recipe {
  return {
    id,
    userId: "user-1",
    title,
    description: null,
    instructions: [],
    imageUrl: null,
    prepTimeMin,
    cookTimeMin: null,
    servings: 2,
    isFreezerFriendly,
    source,
    ingredients: [{
      id: `${id}-line`,
      recipeId: id,
      ingredientId: null,
      displayName,
      quantity: 1,
      unit: "pcs",
      notes: null,
      sortOrder: 0,
    }],
    caloriesPerServing: 1,
    proteinPerServing: null,
    carbsPerServing: null,
    fatPerServing: null,
    fiberPerServing: null,
    costPerServing: null,
    currency: "HUF",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

const recipes: Recipe[] = [
  recipe("1", "Green Bowl", "ai_skill", 29, false, "Brown Rice"),
  recipe("2", "Chili", "manual", 30, true, "Beans"),
];

test("search combines case-insensitive title and ingredient matches with filters", () => {
  assert.deepEqual(filterRecipes(recipes, "quick", " RICE ").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "freezer-friendly", "rice"), []);
  assert.deepEqual(filterRecipes(recipes, "ai-generated", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "all", "CHILI").map((item) => item.id), ["2"]);
  assert.deepEqual(filterRecipes(recipes, "all", "missing"), []);
});

test("filters and counts include exact boundaries and unfiltered totals", () => {
  assert.deepEqual(filterRecipes(recipes, "all", "").map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterRecipes(recipes, "quick", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "ai-generated", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "freezer-friendly", "").map((item) => item.id), ["2"]);
  assert.deepEqual(recipeCounts(recipes), { total: 2 });
  assert.deepEqual(recipeCounts([]), { total: 0 });
});
