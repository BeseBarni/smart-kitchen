import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { shareTokenParamSchema } from "@app/modules/schemas";

const token = "A".repeat(22);
const recipe = {
  title: "Lentil soup",
  description: null,
  instructions: ["Simmer."],
  prepTimeMin: 5,
  cookTimeMin: 20,
  servings: 2,
  calories: 120,
  proteinG: 8,
  carbsG: 16,
  fatG: 2,
  shelfLifeDays: {},
  tags: [],
  ingredients: [],
  imageUrls: { small: null, medium: null, large: null, source: "none" as const },
  sharedAt: "2026-01-02T03:04:05.000Z",
};
let missing = false;
let imageBytes = new Uint8Array([1, 2, 3]);
const moduleMock = mock.module("@app/modules", {
  namedExports: {
    shareTokenParamSchema,
    recipeShareService: {
      getPublicByShareToken: async () => missing
        ? { success: false, error: { code: "ITEM_NOT_FOUND", message: "Recipe share not found." } }
        : { success: true, data: recipe },
      getPublicImage: async () => missing
        ? { success: false, error: { code: "ITEM_NOT_FOUND", message: "Recipe share not found." } }
        : { success: true, data: { bytes: imageBytes, mimeType: "image/jpeg" } },
    },
  },
});
const { publicRecipeRoutes } = await import("./public-recipes.routes");

after(() => moduleMock.restore());

test("public recipe response is wrapped and never cacheable", async () => {
  const response = await publicRecipeRoutes.request(`/${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { data: recipe });
});

test("public image endpoint returns bytes with no-store headers", async () => {
  const response = await publicRecipeRoutes.request(`/${token}/image`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
});

test("missing share token returns not-found for recipe and image", async () => {
  missing = true;
  for (const path of [`/${token}`, `/${token}/image`]) {
    const response = await publicRecipeRoutes.request(path);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
