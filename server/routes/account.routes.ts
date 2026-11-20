import { getAccount } from "@app/modules";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

export const accountRoutes = new Hono<AuthEnvironment>().get(
  "/account",
  requireAuth,
  async (context) => resultToResponse(context, await getAccount(context.get("userId"))),
);
