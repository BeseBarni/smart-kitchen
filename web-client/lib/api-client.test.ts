import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { ApiClientError, unwrapApiResponse } from "./api-client";

test("unwrapApiResponse turns the standard API error envelope into a typed error", async () => {
  const response = new Response(JSON.stringify({
    error: { code: "UNAUTHORIZED", message: "Please sign in again." },
  }), { status: 401, headers: { "Content-Type": "application/json" } });

  await assert.rejects(
    unwrapApiResponse(response, z.object({ ok: z.boolean() })),
    (error: unknown) => error instanceof ApiClientError &&
      error.status === 401 &&
      error.code === "UNAUTHORIZED" &&
      error.message === "Please sign in again.",
  );
});
