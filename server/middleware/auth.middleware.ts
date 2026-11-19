import type { MiddlewareHandler } from "hono";
import { authForRequest } from "./auth";
import { errorResponse } from "./error-handler";

type AuthResponse = Awaited<ReturnType<ReturnType<typeof authForRequest>["getSession"]>>;

export type AuthSession = NonNullable<AuthResponse["data"]>;
export type AuthEnvironment = {
  Variables: {
    userId: string;
    session: AuthSession;
  };
};

export const requireAuth: MiddlewareHandler<AuthEnvironment> = async (context, next) => {
  const { data, error } = await authForRequest(context).getSession();
  if (error) {
    console.error("Could not verify session:", error);
    return errorResponse(context, {
      code: "INTERNAL_ERROR",
      message: "Could not verify the authentication session.",
    });
  }
  if (!data?.user) {
    return errorResponse(context, {
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
  context.set("userId", data.user.id);
  context.set("session", data);
  await next();
};
