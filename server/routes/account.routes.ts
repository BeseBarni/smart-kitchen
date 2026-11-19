import { getAccount } from "@app/modules";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";

export const accountRoutes = new Hono<AuthEnvironment>().get(
  "/account",
  requireAuth,
  async (context) => {
    const result = await getAccount(context.get("userId"));
    if (!result.success) return context.json({ error: result.error.message }, 404);
    return context.json(result.data);
  },
);
