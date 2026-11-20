import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";

const webClientPath = resolve("web-client");
const require = createRequire(resolve(webClientPath, "package.json"));
const tokenCookie = "__Secure-neon-auth.session_token=test-session";
const session = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Test", email: "test@example.invalid" },
  session: {
    id: "test-session",
    userId: "00000000-0000-4000-8000-000000000001",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
};

let authServer: Server;
let nextServer: ChildProcess;
let origin: string;
let sessionActive = false;

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a test port.");
  return address.port;
}

before(async () => {
  authServer = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url?.startsWith("/auth/sign-in/email")) {
      sessionActive = true;
      response.setHeader("set-cookie", `${tokenCookie}; Path=/; HttpOnly; Secure`);
      response.end(JSON.stringify({ user: session.user, token: "test-session" }));
    } else if (request.url?.startsWith("/auth/sign-out")) {
      sessionActive = false;
      response.setHeader("set-cookie", "__Secure-neon-auth.session_token=; Path=/; Max-Age=0; HttpOnly; Secure");
      response.end(JSON.stringify({ success: true }));
    } else if (request.url?.startsWith("/auth/get-session")) {
      const authenticated = sessionActive && request.headers.cookie?.includes(tokenCookie);
      if (authenticated) response.setHeader("set-cookie", `${tokenCookie}; Path=/; HttpOnly; Secure`);
      response.end(JSON.stringify(authenticated ? session : null));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ message: "Not found" }));
    }
  });
  const authPort = await listen(authServer);
  const reservation = createServer();
  const appPort = await listen(reservation);
  await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  origin = `http://127.0.0.1:${appPort}`;
  nextServer = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(appPort)], {
    cwd: webClientPath,
    env: {
      ...process.env,
      NEON_AUTH_BASE_URL: `http://127.0.0.1:${authPort}/auth`,
      NEON_AUTH_COOKIE_SECRET: "test-secret-at-least-32-characters-long",
    },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (nextServer.exitCode !== null) throw new Error("Next.js test server exited before becoming ready.");
    try {
      const response = await fetch(`${origin}/auth/sign-in`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Next.js test server did not become ready.");
});

after(async () => {
  if (nextServer && nextServer.exitCode === null) {
    nextServer.kill();
    await new Promise<void>((resolve) => nextServer.once("exit", () => resolve()));
  }
  if (authServer?.listening) await new Promise<void>((resolve) => authServer.close(() => resolve()));
});

test("page guards and session proxy support login and logout", async () => {
  const anonymous = await fetch(`${origin}/chat`, { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  assert.equal(new URL(anonymous.headers.get("location") ?? "", origin).pathname, "/auth/sign-in");

  const login = await fetch(`${origin}/auth/sign-in`);
  assert.match(await login.text(), /Continue with Google/);

  for (const path of ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/sw.js", "/offline.html", "/recipes/gyros.jpg"]) {
    const asset = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(asset.status, 200, path);
  }
  const health = await fetch(`${origin}/api/health`, { redirect: "manual" });
  assert.equal(health.status, 401);

  const signIn = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "test@example.invalid", password: "password" }),
  });
  assert.equal(signIn.status, 200);
  assert.match(signIn.headers.get("set-cookie") ?? "", /session_token=test-session/);

  const chat = await fetch(`${origin}/chat`, { headers: { cookie: tokenCookie }, redirect: "manual" });
  assert.equal(chat.status, 200);
  const signedInLogin = await fetch(`${origin}/auth/sign-in`, { headers: { cookie: tokenCookie }, redirect: "manual" });
  const body = await signedInLogin.text();
  assert.ok(signedInLogin.status === 307 || body.includes("NEXT_REDIRECT"), "signed-in login must redirect");
  assert.doesNotMatch(body, /Continue with Google/);
  assert.match(signedInLogin.headers.get("set-cookie") ?? "", /session_token=test-session|session_data=/);

  const signOut = await fetch(`${origin}/api/auth/sign-out`, {
    method: "POST",
    headers: { cookie: tokenCookie },
  });
  assert.equal(signOut.status, 200);
  assert.match(signOut.headers.get("set-cookie") ?? "", /session_token=;/);
  const afterLogout = await fetch(`${origin}/chat`, { redirect: "manual" });
  assert.equal(afterLogout.status, 307);
  const revoked = await fetch(`${origin}/chat`, { headers: { cookie: tokenCookie }, redirect: "manual" });
  assert.equal(revoked.status, 307);
});
