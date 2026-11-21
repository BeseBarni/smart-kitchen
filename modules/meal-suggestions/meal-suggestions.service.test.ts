import assert from "node:assert/strict";
import test from "node:test";
import { validateSuggestions } from "./meal-suggestions.service";
import {
  mealSuggestionsRequestSchema, mealSuggestionsResponseSchema, type MealSuggestions, type SuggestionContext,
} from "./meal-suggestions.schema";

const id = "10000000-0000-4000-8000-000000000001";
const context: SuggestionContext = {
  date: "2026-03-29",
  stock: [{ id, name: "Beans", itemType: "ingredient", storageLocation: "pantry", remainingQuantity: 2, unit: "portion", caloriesPerUnit: null, proteinPerUnit: null, carbsPerUnit: null, fatPerUnit: null, fiberPerUnit: null }],
  profile: { dailyCalorieTarget: null, dailyProteinG: null, dailyCarbsG: null, dailyFatG: null, dailyFiberG: null, dietaryPreferences: null },
  consumed: {
    calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0,
    unknownCaloriesCount: 0, unknownProteinCount: 0, unknownCarbsCount: 0, unknownFatCount: 0, unknownFiberCount: 0,
  },
};
const plan: MealSuggestions = {
  note: "Estimated fiber.",
  suggestions: [{ mealType: "lunch", title: "Beans", explanation: "Cook thoroughly.", estimatedFiberG: 4, items: [{ inventoryItemId: id, quantity: 1 }] }],
};

test("meal suggestions requests carry a supported locale and default to English", () => {
  const request = {
    date: "2026-03-29",
    from: "2026-03-29T00:00:00.000Z",
    to: "2026-03-30T00:00:00.000Z",
  };
  assert.equal(mealSuggestionsRequestSchema.parse(request).locale, "en");
  assert.equal(mealSuggestionsRequestSchema.parse({ ...request, locale: "hu" }).locale, "hu");
  assert.equal(mealSuggestionsRequestSchema.safeParse({ ...request, locale: "fr" }).success, false);
  assert.equal(mealSuggestionsResponseSchema.parse({ suggestions: [], note: "", noStock: true }).noStock, true);
});

test("valid suggestions include authoritative stock names", () => {
  const result = validateSuggestions(context, plan);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.suggestions[0]?.items[0]?.name, "Beans");
});

test("rejects unavailable IDs and quantities exceeding stock across meals", () => {
  assert.equal(validateSuggestions(context, { ...plan, suggestions: [{ ...plan.suggestions[0]!, items: [{ inventoryItemId: "20000000-0000-4000-8000-000000000002", quantity: 1 }] }] }).success, false);
  assert.equal(validateSuggestions(context, { ...plan, suggestions: [plan.suggestions[0]!, { ...plan.suggestions[0]!, mealType: "dinner", items: [{ inventoryItemId: id, quantity: 1.5 }] }] }).success, false);
});
