import assert from "node:assert/strict";
import test from "node:test";
import { ingredientsCreateTool } from "./ingredients.tools";
import { inventoryAddBatchTool, inventoryAddTool } from "./inventory.write.tools";
import { recipeCreateTool } from "./recipes.write.tools";
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
