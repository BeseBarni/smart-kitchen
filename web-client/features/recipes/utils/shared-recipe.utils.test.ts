import assert from "node:assert/strict";
import { test } from "node:test";
import { scaleIngredientQuantity } from "./shared-recipe.utils";

test("scales ingredient amounts proportionally from the original servings", () => {
  assert.equal(scaleIngredientQuantity(200, 4, 2), 100);
  assert.equal(scaleIngredientQuantity(1.5, 3, 5), 2.5);
});
