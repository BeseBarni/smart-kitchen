import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RecipeAssistantResponse } from "./RecipeAssistantResponse";
import { SharedRecipeFullView } from "./shared/SharedRecipeFullView";
import type { SharedRecipePublicDto } from "@app/modules/schemas";

test("renders the full assistant response as markdown", () => {
  const markup = renderToStaticMarkup(<RecipeAssistantResponse response={"Try **this soup**."} />);
  assert.match(markup, /<details/);
  assert.match(markup, /<strong>this soup<\/strong>/);
});

test("omits the response when none was saved", () => {
  assert.equal(renderToStaticMarkup(<RecipeAssistantResponse response={null} />), "");
});

test("shared recipe view includes its saved assistant response", () => {
  const recipe: SharedRecipePublicDto = {
    title: "Soup", description: null, assistantResponse: "Try **this soup**.", instructions: [],
    prepTimeMin: null, cookTimeMin: null, servings: 2, calories: null, proteinG: null,
    carbsG: null, fatG: null, shelfLifeDays: {}, tags: [], ingredients: [],
    imageUrls: { small: null, medium: null, large: null, source: "none" },
    sharedAt: "2026-01-01T00:00:00.000Z",
  };
  assert.match(renderToStaticMarkup(<SharedRecipeFullView recipe={recipe} />), /<strong>this soup<\/strong>/);
});
