import assert from "node:assert/strict";
import test from "node:test";
import { suggestShoppingItems } from "./shopping-matching";

test("subtracts exact-name inventory with compatible units and avoids allocating stock twice", () => {
  const suggestions = suggestShoppingItems([
    { name: "Rice", unit: "g", quantity: 800 },
    { name: "rice", unit: "g", quantity: 500 },
  ], [{ name: " RICE ", unit: "kg", quantity: 1 }]);
  assert.deepEqual(suggestions.map((item) => item.missingQuantity), [0, 300]);
});

test("keeps approximate or incompatible matches visible without deducting them", () => {
  const [suggestion] = suggestShoppingItems(
    [{ name: "Chicken breast", unit: "g", quantity: 500 }],
    [{ name: "Chicken", unit: "g", quantity: 200 }, { name: "Chicken breast", unit: "pieces", quantity: 2 }],
  );
  assert.equal(suggestion?.missingQuantity, 500);
  assert.deepEqual(suggestion?.uncertainMatches, ["Chicken (200 g)", "Chicken breast (2 pieces)"]);
});

test("rounds small partial shortages up to shopping-list precision", () => {
  const [suggestion] = suggestShoppingItems(
    [{ name: "Oil", unit: "l", quantity: 1 }],
    [{ name: "Oil", unit: "ml", quantity: 999 }],
  );
  assert.equal(suggestion?.missingQuantity, 0.001);
});
