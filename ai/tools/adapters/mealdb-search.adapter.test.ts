import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { mealDbSearchForAgent } from "./mealdb-search.adapter";

const toolContext = {
  userId: "user-1", agent: "recipe_architect" as const, emit: () => {}, recordLedger: async () => {},
};

test("translates localized meal terms and tries the English alternative before filtering", async () => {
  const requests: string[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    requests.push(`${url.pathname.split("/").pop()}?${url.searchParams.toString()}`);
    if (url.pathname.endsWith("search.php") && url.searchParams.get("s") === "Chicken shawarma") {
      return Response.json({ meals: [{ idMeal: "1", strMeal: "Chicken shawarma" }] });
    }
    if (url.pathname.endsWith("lookup.php")) {
      return Response.json({ meals: [{
        idMeal: "1", strMeal: "Chicken shawarma",
        strMealThumb: "https://www.themealdb.com/images/media/meals/example.jpg",
      }] });
    }
    return Response.json({ meals: null });
  });
  try {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const tool = mealDbSearchForAgent({ usage }, async () => ({
      success: true, data: {
        output: { query: "Chicken gyros", fallbackEnglishTerm: "Chicken shawarma", mainIngredient: "Chicken" },
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    }));
    const result = await tool.execute({
      kind: "meal", query: "csirkés gyros", fallbackEnglishTerm: "csirkés shawarma", mainIngredient: "csirke",
    }, toolContext);
    assert.equal(result.success, true);
    assert.deepEqual(requests, [
      "search.php?s=Chicken+gyros", "search.php?s=Chicken+shawarma", "lookup.php?i=1",
    ]);
    assert.deepEqual(usage, { inputTokens: 10, outputTokens: 5 });
  } finally {
    fetchMock.mock.restore();
  }
});

test("translates ingredient searches and refuses an untranslatable query", async () => {
  let fetchCount = 0;
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    fetchCount += 1;
    return Response.json({ meals: [{ idIngredient: "1", strIngredient: "Chicken" }] });
  });
  try {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const translated = mealDbSearchForAgent({ usage }, async () => ({
      success: true, data: {
        output: { query: "Chicken", fallbackEnglishTerm: null, mainIngredient: null },
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    }));
    const result = await translated.execute({ kind: "ingredient", query: "csirke" }, toolContext);
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data, { candidates: [{
      label: "Chicken", stockImageKind: "themealdb_ingredient", stockImageName: "chicken",
      previewUrl: "https://www.themealdb.com/images/ingredients/chicken-medium.png",
    }] });

    const cannotTranslate = mealDbSearchForAgent({ usage }, async () => ({
      success: true, data: {
        output: { query: null, fallbackEnglishTerm: null, mainIngredient: null },
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    }));
    const failed = await cannotTranslate.execute({ kind: "meal", query: "ismeretlen" }, toolContext);
    assert.equal(failed.success, false);
    assert.equal(fetchCount, 1);
  } finally {
    fetchMock.mock.restore();
  }
});

test("uses the translated main ingredient only after English name searches fail", async () => {
  const requests: string[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    requests.push(`${url.pathname.split("/").pop()}?${url.searchParams.toString()}`);
    return Response.json({ meals: null });
  });
  try {
    const tool = mealDbSearchForAgent({ usage: { inputTokens: 0, outputTokens: 0 } }, async () => ({
      success: true, data: {
        output: { query: "Chicken gyros", fallbackEnglishTerm: null, mainIngredient: "Chicken" },
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    }));
    const result = await tool.execute({ kind: "meal", query: "csirkés gyros", mainIngredient: "csirke" }, toolContext);
    assert.equal(result.success, true);
    assert.deepEqual(requests, ["search.php?s=Chicken+gyros", "filter.php?i=Chicken"]);
  } finally {
    fetchMock.mock.restore();
  }
});

test("does not search if translation fails", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("TheMealDB must not be called");
  });
  try {
    const tool = mealDbSearchForAgent({ usage: { inputTokens: 0, outputTokens: 0 } }, async () => ({
      success: false, error: { code: "INTERNAL_ERROR", message: "Translation unavailable." },
    }));
    const result = await tool.execute({ kind: "meal", query: "csirkés gyros" }, toolContext);
    assert.deepEqual(result, { success: false, error: { code: "INTERNAL_ERROR", message: "Translation unavailable." } });
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally {
    fetchMock.mock.restore();
  }
});
