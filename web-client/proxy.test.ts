import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import proxy from "./proxy";

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

test("protected pages redirect anonymous visitors to login", async () => {
  configureAuth();
  for (const path of ["/", "/chat", "/inventory", "/recipes", "/account"]) {
    const response = await proxy(new NextRequest(`http://localhost${path}`));
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/auth/sign-in");
  }
});

test("sign-in remains reachable without a session", async () => {
  configureAuth();
  const response = await proxy(new NextRequest("http://localhost/auth/sign-in"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("login guard reports session verification failures", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json({ message: "Auth unavailable" }, { status: 503 });
  const response = await proxy(new NextRequest("http://localhost/auth/sign-in", {
    headers: { cookie: "__Secure-neon-auth.session_token=test-session" },
  }));
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Google OAuth verifier is exchanged on the chat callback", async () => {
  configureAuth();
  let upstream = "";
  globalThis.fetch = async (input) => {
    upstream = String(input);
    return Response.json(null, {
      headers: { "set-cookie": "__Secure-neon-auth.session_challenge=; Path=/; Max-Age=0" },
    });
  };
  const response = await proxy(new NextRequest(
    "http://localhost/chat?neon_auth_session_verifier=test-verifier",
    { headers: { cookie: "__Secure-neon-auth.session_challenge=test-challenge" } },
  ));
  assert.match(upstream, /\/auth\/get-session\?neon_auth_session_verifier=test-verifier$/);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/chat");
  assert.match(response.headers.get("set-cookie") ?? "", /session_challenge/);
});
