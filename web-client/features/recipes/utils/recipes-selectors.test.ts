import assert from "node:assert/strict";
import test from "node:test";
import type { Recipe } from "../types";
import { filterRecipes, recipeCounts } from "./recipes-selectors";

const recipes: Recipe[] = [
  { id: "1", title: "Green Bowl", image: "/1", imageAlt: "", highlight: "", stockLabel: "", prepMinutes: 29, portions: 1, storageLabel: "", calories: 1, ingredients: ["Brown Rice"], tags: ["meal-prep", "ai-generated"], favorite: true },
  { id: "2", title: "Chili", image: "/2", imageAlt: "", highlight: "", stockLabel: "", prepMinutes: 30, portions: 2, storageLabel: "", calories: 2, ingredients: ["Beans"], tags: ["freezer-friendly"], favorite: false },
];

test("search combines case-insensitive title, ingredient and tag matches with filters", () => {
  assert.deepEqual(filterRecipes(recipes, "meal-prep", " RICE ").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "freezer-friendly", "rice"), []);
  assert.deepEqual(filterRecipes(recipes, "all", "AI GENERATED").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "all", "CHILI").map((item) => item.id), ["2"]);
  assert.deepEqual(filterRecipes(recipes, "all", "missing"), []);
});

test("filters and counts include exact boundaries and unfiltered totals", () => {
  assert.deepEqual(filterRecipes(recipes, "all", "").map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterRecipes(recipes, "quick", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "ai-generated", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterRecipes(recipes, "freezer-friendly", "").map((item) => item.id), ["2"]);
  assert.deepEqual(recipeCounts(recipes), { total: 2, favorites: 1 });
  assert.deepEqual(recipeCounts([]), { total: 0, favorites: 0 });
});
