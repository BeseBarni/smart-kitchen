import assert from "node:assert/strict";
import test from "node:test";
import { uiDirectiveSchema } from "@app/ai/stream-schema";
import { createRecipeSchema } from "@app/modules/schemas";
import { recipeDraftCreateInput } from "./use-chat-recipe-actions";

test("streamed recipe drafts retain storage estimates when saved", () => {
  const directive = uiDirectiveSchema.parse({
    component: "recipe_preview_card", status: "draft", canSave: true, canCookAndStock: false,
    recipe: {
      title: "Soup", description: "Soup", servings: 2, ingredients: [], instructions: ["Cook."],
      shelfLifeDays: { fridge: 3, freezer: 90, pantry: null },
    },
  });

  assert.equal(directive.component, "recipe_preview_card");
  if (directive.component !== "recipe_preview_card") return;
  const input = createRecipeSchema.parse(recipeDraftCreateInput(directive.recipe));
  assert.deepEqual(input.shelfLifeDays, { fridge: 3, freezer: 90, pantry: null });
});

test("saving a streamed recipe retains its stock image reference", () => {
  const directive = uiDirectiveSchema.parse({
    component: "recipe_preview_card", status: "draft", canSave: true, canCookAndStock: false,
    recipe: {
      title: "Chicken gyros", description: "Gyros", servings: 2, ingredients: [], instructions: ["Cook."],
      stockImageKind: "themealdb_meal", stockImageName: "hcg6l91763596970.jpg",
    },
  });
  assert.equal(directive.component, "recipe_preview_card");
  if (directive.component !== "recipe_preview_card") return;
  const input = createRecipeSchema.parse(recipeDraftCreateInput(directive.recipe));
  assert.equal(input.stockImageKind, "themealdb_meal");
  assert.equal(input.stockImageName, "hcg6l91763596970.jpg");
  assert.equal(input.imageUrl, null);
});
