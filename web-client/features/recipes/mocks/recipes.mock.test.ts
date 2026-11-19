import assert from "node:assert/strict";
import test from "node:test";
import { listRecipes, setRecipeFavorite } from "./recipes.mock";

test("recipe mocks isolate list and mutation results, and update favorites", async () => {
  const first = await listRecipes();
  const recipe = first[0];
  assert.ok(recipe);
  const originalTitle = recipe.title;
  recipe.title = "Changed";
  recipe.ingredients.push("Changed");
  assert.equal((await listRecipes())[0]?.title, originalTitle);
  assert.ok(!(await listRecipes())[0]?.ingredients.includes("Changed"));

  const updated = await setRecipeFavorite({ id: recipe.id, favorite: true });
  assert.equal(updated.favorite, true);
  updated.title = "Changed again";
  assert.equal((await listRecipes())[0]?.title, originalTitle);
  assert.equal((await listRecipes())[0]?.favorite, true);
  await setRecipeFavorite({ id: recipe.id, favorite: false });
  assert.equal((await listRecipes())[0]?.favorite, false);
  await assert.rejects(setRecipeFavorite({ id: "missing", favorite: true }), /not found/);
});

test("a failed favorite response leaves mock state unchanged", async () => {
  const recipe = (await listRecipes())[0];
  assert.ok(recipe);
  const clone = globalThis.structuredClone;
  try {
    globalThis.structuredClone = () => { throw new Error("Clone failed"); };
    await assert.rejects(setRecipeFavorite({ id: recipe.id, favorite: !recipe.favorite }), /Clone failed/);
  } finally {
    globalThis.structuredClone = clone;
  }
  assert.equal((await listRecipes())[0]?.favorite, recipe.favorite);
});
