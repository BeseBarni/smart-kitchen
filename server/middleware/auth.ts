import { createAuthServer, resolveNeonAuthLogging, serializeSetCookie, validateCookieConfig } from "@neon/auth/server";
import type { Context } from "hono";

export function authConfig(): { baseUrl: string; cookieSecret: string } {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) throw new Error("Neon Auth environment variables are required.");
  validateCookieConfig({ secret: cookieSecret });
  return { baseUrl, cookieSecret };
}

export const authLog = resolveNeonAuthLogging({});

export function authForRequest(c: Context): ReturnType<typeof createAuthServer> {
  const config = authConfig();
  return createAuthServer({
    ...config,
    log: authLog,
    context: () => ({
      getCookies: () => c.req.header("cookie") ?? "",
      setCookie: (name, value, options) => {
        c.header("Set-Cookie", serializeSetCookie({ name, value, ...options }), { append: true });
      },
      getHeader: (name) => c.req.header(name) ?? null,
      getOrigin: () => c.req.header("origin") ?? "",
      getFramework: () => "hono",
    }),
  });
}
