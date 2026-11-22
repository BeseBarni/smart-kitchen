import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { MiddlewareHandler } from "hono";

test("manual image searches translate terms before querying TheMealDB and surface failures", async () => {
  let fail = false;
  const normalize = mock.module("@app/ai/mealdb-search", {
    namedExports: {
      normalizeMealDbSearch: async (input: { kind: "meal" | "ingredient"; mainIngredient?: string }) => fail
        ? { success: false, error: { code: "INTERNAL_ERROR", message: "Translation unavailable." } }
        : { success: true, data: { output: {
          kind: input.kind, query: "Chicken gyros", ...(input.mainIngredient ? { mainIngredient: "Chicken" } : {}),
        }, usage: { inputTokens: 1, outputTokens: 1 } } },
    },
  });
  const requireAuth: MiddlewareHandler = async (_context, next) => next();
  const auth = mock.module(new URL("../middleware/auth.middleware.ts", import.meta.url), { namedExports: { requireAuth } });
  const requests: string[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    requests.push(`${url.pathname.split("/").pop()}?${url.searchParams.toString()}`);
    return Response.json({ meals: null });
  });
  try {
    const { mealDbRoutes } = await import("./mealdb.routes");
    const response = await mealDbRoutes.request("/images/search?kind=meal&q=csirk%C3%A9s%20gyros&mainIngredient=csirke");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.deepEqual(requests, ["search.php?s=Chicken+gyros", "filter.php?i=Chicken"]);
    fail = true;
    const failed = await mealDbRoutes.request("/images/search?kind=meal&q=gyros");
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { error: { code: "INTERNAL_ERROR", message: "Translation unavailable." } });
    assert.equal(requests.length, 2);
  } finally {
    fetchMock.mock.restore();
    auth.restore();
    normalize.restore();
  }
});
