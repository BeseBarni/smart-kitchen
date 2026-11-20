import { createNeonAuth } from "@neon/auth/next/server";
import { validateCookieConfig } from "@neon/auth/server";

export function getAuthConfig(): { baseUrl: string; cookieSecret: string } {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) {
    throw new Error("NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are required.");
  }
  validateCookieConfig({ secret: cookieSecret });
  return { baseUrl, cookieSecret };
}

export function getAuthServer(): ReturnType<typeof createNeonAuth> {
  const { baseUrl, cookieSecret } = getAuthConfig();
  return createNeonAuth({ baseUrl, cookies: { secret: cookieSecret } });
}
