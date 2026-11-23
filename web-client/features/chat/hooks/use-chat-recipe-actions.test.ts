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
      caloriesPerServing: 320.5, proteinPerServing: 15, carbsPerServing: 40,
      fatPerServing: 5, fiberPerServing: 8,
      shelfLifeDays: { fridge: 3, freezer: 90, pantry: null },
    },
  });

  assert.equal(directive.component, "recipe_preview_card");
  if (directive.component !== "recipe_preview_card") return;
  const input = createRecipeSchema.parse(recipeDraftCreateInput(directive.recipe, "**Delicious** soup."));
  assert.equal(input.assistantResponse, "**Delicious** soup.");
  assert.deepEqual(input.shelfLifeDays, { fridge: 3, freezer: 90, pantry: null });
  assert.deepEqual(
    [input.caloriesPerServing, input.proteinPerServing, input.carbsPerServing, input.fatPerServing, input.fiberPerServing],
    [320.5, 15, 40, 5, 8],
  );
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
