import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { app } from "../index";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEON_AUTH_BASE_URL;
const originalSecret = process.env.NEON_AUTH_COOKIE_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEON_AUTH_BASE_URL;
  else process.env.NEON_AUTH_BASE_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.NEON_AUTH_COOKIE_SECRET;
  else process.env.NEON_AUTH_COOKIE_SECRET = originalSecret;
});

function configureAuth(): void {
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.invalid/auth";
  process.env.NEON_AUTH_COOKIE_SECRET = "test-secret-at-least-32-characters-long";
}

test("account rejects a request without a session", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json(null);
  const response = await app.request("http://localhost/api/account");
  assert.equal(response.status, 401);
});

test("auth proxy forwards sign-in failures from Neon", async () => {
  configureAuth();
  let upstream = "";
  globalThis.fetch = async (input) => {
    upstream = String(input);
    return Response.json({ code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 });
  };
  const response = await app.request("http://localhost/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ email: "test@example.invalid", password: "invalid" }),
  });
  assert.equal(upstream, "https://auth.example.invalid/auth/sign-in/email");
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "INVALID_EMAIL_OR_PASSWORD" });
});
