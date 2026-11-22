import assert from "node:assert/strict";
import test from "node:test";
import { ingredientsCreateTool } from "./ingredients.tools";
import { inventoryAddBatchTool, inventoryAddTool } from "./inventory.write.tools";
import { recipeCreateTool } from "./recipes.write.tools";
import { presentRecipeDraftTool } from "./ui.tools";
import { mealPrepArchitectSkill } from "../../skills/meal-prep-architect.skill";

test("AI creation schemas require shelf-life estimates for all storage locations", () => {
  const shelfLifeDays = { fridge: 3, freezer: 90, pantry: null };
  const schemas = [
    ingredientsCreateTool.inputSchema,
    inventoryAddTool.inputSchema,
    inventoryAddBatchTool.inputSchema,
    recipeCreateTool.inputSchema,
    mealPrepArchitectSkill.outputSchema,
  ];
  for (const schema of schemas) {
    const issues = schema.safeParse({}).error?.issues ?? [];
    assert.ok(issues.some((issue) => issue.path.includes(
      schema === inventoryAddBatchTool.inputSchema ? "items" : "shelfLifeDays",
    )));
  }
  const batch = { items: [{ name: "Soup", quantity: 1, unit: "portion", storageLocation: "fridge", shelfLifeDays }] };
  assert.equal(inventoryAddBatchTool.inputSchema.safeParse(batch).success, true);
  assert.equal(inventoryAddBatchTool.inputSchema.safeParse({ items: [{ ...batch.items[0], shelfLifeDays: { fridge: 3 } }] }).success, false);
});

test("generated recipe tools require explicit per-serving calorie and macro estimates or unknowns", () => {
  const macros = { caloriesPerServing: 320, proteinPerServing: 15, carbsPerServing: 40, fatPerServing: 5, fiberPerServing: 8 };
  const recipe = {
    title: "Soup", description: "Soup", servings: 2, ingredients: [], instructions: ["Cook."],
    ...macros, shelfLifeDays: { fridge: 3, freezer: 90, pantry: null },
  };
  assert.equal(presentRecipeDraftTool.inputSchema.safeParse({ recipe }).success, true);
  assert.equal(presentRecipeDraftTool.inputSchema.safeParse({
    recipe: { ...recipe, caloriesPerServing: undefined },
  }).success, false);
  assert.equal(presentRecipeDraftTool.inputSchema.safeParse({
    recipe: { ...recipe, caloriesPerServing: null },
  }).success, true);
  const create = {
    ...recipe, imageUrl: null, prepTimeMin: null, cookTimeMin: null,
    isFreezerFriendly: true, source: "ai_skill", currency: "USD",
  };
  assert.equal(recipeCreateTool.inputSchema.safeParse(create).success, true);
  assert.equal(recipeCreateTool.inputSchema.safeParse({ ...create, caloriesPerServing: undefined }).success, false);
});
