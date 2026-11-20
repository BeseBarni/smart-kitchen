import assert from "node:assert/strict";
import test from "node:test";
import { uiDirectiveSchema } from "../../core/stream.schema";
import { recipesDetailTool } from "./recipes.read.tools";

test("saved recipe details produce a history-compatible recipe card", () => {
  const recipe = {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "Soup",
    description: null,
    instructions: ["Cook."],
    imageUrl: null,
    prepTimeMin: 10,
    cookTimeMin: 20,
    servings: 2,
    isFreezerFriendly: true,
    source: "manual",
    ingredients: [],
    caloriesPerServing: null,
    proteinPerServing: null,
    carbsPerServing: null,
    fatPerServing: null,
    costPerServing: null,
    currency: "USD",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  };
  assert.ok(recipesDetailTool.toUiDirective);
  const directive = uiDirectiveSchema.parse(recipesDetailTool.toUiDirective(recipe));
  assert.equal(directive.component, "recipe_preview_card");
  if (directive.component !== "recipe_preview_card") throw new Error("Expected recipe card.");
  assert.equal(directive.status, "saved");
  assert.equal(directive.recipe.prepTimeMin, 10);
  assert.equal(directive.recipe.instructions[0], "Cook.");
});
