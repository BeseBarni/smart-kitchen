import assert from "node:assert/strict";
import test from "node:test";
import {
  extractMealDbMealImageName,
  normalizeMealDbIngredientImageName,
  resolveEntityImages,
  resolveMealDbImageUrl,
} from "./mealdb-image.utils";

test("normalizes and resolves meal and ingredient stock images", () => {
  assert.equal(normalizeMealDbIngredientImageName("  Chicken Breast  "), "chicken_breast");
  assert.equal(
    resolveMealDbImageUrl("themealdb_meal", "llcbn01574260722.jpg", "small"),
    "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg/small",
  );
  assert.equal(
    resolveMealDbImageUrl("themealdb_ingredient", "chicken_breast", "medium"),
    "https://www.themealdb.com/images/ingredients/chicken_breast-medium.png",
  );
});

test("extracts only a safe filename from a TheMealDB meal URL", () => {
  assert.equal(
    extractMealDbMealImageName("https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg"),
    "llcbn01574260722.jpg",
  );
  assert.equal(
    extractMealDbMealImageName("https://example.com/images/media/meals/test.jpg"),
    null,
  );
});

test("applies uploaded, stock, legacy, and none image precedence", () => {
  assert.equal(resolveEntityImages({
    imageAssetId: "asset-id",
    stockImageKind: "themealdb_meal",
    stockImageName: "meal.jpg",
  }).source, "upload");
  assert.equal(resolveEntityImages({
    stockImageKind: "themealdb_ingredient",
    stockImageName: "chicken_breast",
  }).source, "themealdb");
  assert.equal(resolveEntityImages({ imageUrl: "https://example.com/legacy.jpg" }).source, "legacy");
  assert.equal(resolveEntityImages({}).source, "none");
});
