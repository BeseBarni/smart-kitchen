import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { app } from "../index";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEON_AUTH_BASE_URL;
const originalSecret = process.env.NEON_AUTH_COOKIE_SECRET;
const originalCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEON_AUTH_BASE_URL;
  else process.env.NEON_AUTH_BASE_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.NEON_AUTH_COOKIE_SECRET;
  else process.env.NEON_AUTH_COOKIE_SECRET = originalSecret;
  if (originalCorsOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
  else process.env.CORS_ALLOWED_ORIGINS = originalCorsOrigins;
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
  assert.deepEqual(await response.json(), {
    error: { code: "UNAUTHORIZED", message: "Authentication required." },
  });
});

test("protected API routes reject unauthenticated reads and mutations before validation", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json(null);
  const requests = new Set(app.routes
    .filter(({ method, path }) =>
      method !== "ALL"
      && !path.startsWith("/api/auth/")
      && !(method === "GET" && path.startsWith("/api/public/recipes/")),
    )
    .map(({ method, path }) => `${method} ${path.replace(/:[^/]+/g, "not-a-uuid")}`));
  assert.ok(requests.size > 0);
  for (const request of requests) {
    const [method, path] = request.split(" ");
    const response = await app.request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json" },
      ...(method === "POST" || method === "PATCH" ? { body: "{}" } : {}),
    });
    assert.equal(response.status, 401, request);
  }
});

test("public recipe routes are reachable without a session and validate tokens", async () => {
  const response = await app.request("http://localhost/api/public/recipes/not-a-token");
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("expired sessions are rejected", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json(null);
  const response = await app.request("http://localhost/api/health", {
    headers: { cookie: "__Secure-neon-auth.session_token=expired" },
  });
  assert.equal(response.status, 401);
});

test("session verification failure is not treated as an unauthenticated session", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json({ message: "Auth unavailable" }, { status: 503 });
  const response = await app.request("http://localhost/api/health");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: "INTERNAL_ERROR", message: "Could not verify the authentication session." },
  });
});

test("authenticated requests reach validation after session verification", async () => {
  configureAuth();
  globalThis.fetch = async () => Response.json({
    user: { id: "00000000-0000-4000-8000-000000000001" },
    session: { id: "session" },
  });
  const response = await app.request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 400);
});

test("API handles credentialed CORS preflight requests", async () => {
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3218";
  const response = await app.request("http://localhost/api/health", {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:3218",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3218");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
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

test("auth proxy forwards Google sign-in callbacks and the session challenge", async () => {
  configureAuth();
  let upstreamBody = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://auth.example.invalid/auth/sign-in/social");
    upstreamBody = String(init?.body);
    return Response.json({ url: "https://accounts.google.com/test" }, {
      headers: { "set-cookie": "__Secure-neon-auth.session_challenge=challenge; Path=/; HttpOnly" },
    });
  };
  const body = {
    provider: "google",
    callbackURL: "http://localhost/chat",
    errorCallbackURL: "http://localhost/auth/sign-in?error=google",
  };
  const response = await app.request("http://localhost/api/auth/sign-in/social", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(upstreamBody), body);
  assert.match(response.headers.get("set-cookie") ?? "", /session_challenge=challenge/);
});
