import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPublicApiJson, resolvePublicApiOrigin } from "./shared-recipes.api";

test("uses the incoming Vercel host instead of the deployment-specific hostname", () => {
  const origin = resolvePublicApiOrigin(new Headers({
    host: "deployment-id.vercel.app",
    "x-forwarded-host": "smart-kitchen-flame.vercel.app",
    "x-forwarded-proto": "https",
  }), false);

  assert.equal(origin.origin, "https://smart-kitchen-flame.vercel.app");
});

test("uses HTTP for local requests without forwarded protocol", () => {
  const origin = resolvePublicApiOrigin(new Headers({ host: "localhost:3000" }), true);
  assert.equal(origin.origin, "http://localhost:3000");
});

test("reports HTML responses as a non-JSON API response", () => {
  const response = new Response("<!DOCTYPE html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

  assert.throws(() => assertPublicApiJson(response), /non-JSON response.*200.*text\/html/);
});
