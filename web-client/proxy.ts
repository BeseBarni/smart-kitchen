import { handleAuthProxyRequest, NEON_AUTH_SESSION_COOKIE_NAME } from "@neon/auth/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthConfig, getAuthServer } from "./lib/auth-server";

const sessionSchema = z.object({
  user: z.object({ id: z.string() }).nullable(),
  session: z.object({ id: z.string() }).nullable(),
}).nullable();

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/auth/sign-in" && request.cookies.has(NEON_AUTH_SESSION_COOKIE_NAME)) {
    const sessionResponse = await handleAuthProxyRequest({
      ...getAuthConfig(),
      request: new Request(new URL("/api/auth/get-session", request.url), { headers: request.headers }),
      path: "get-session",
    });
    if (!sessionResponse.ok) {
      console.error("Could not verify the authentication session:", sessionResponse.status);
      return new NextResponse("Could not verify the authentication session.", { status: 503 });
    }
    const session = sessionSchema.safeParse(await sessionResponse.json());
    if (!session.success || Boolean(session.data?.user) !== Boolean(session.data?.session)) {
      console.error("Invalid authentication session response.");
      return new NextResponse("Could not verify the authentication session.", { status: 503 });
    }
    const response = session.data?.user
      ? NextResponse.redirect(new URL("/chat", request.url))
      : NextResponse.next();
    for (const cookie of sessionResponse.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
    return response;
  }
  return getAuthServer().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js$|offline\\.html$|icons/|recipes/.*\\.).*)"],
};
