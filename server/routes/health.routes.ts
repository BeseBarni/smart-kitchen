import { pingDatabase } from "@app/db";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";

export const healthRoutes = new Hono<AuthEnvironment>().get("/health", requireAuth, async (context) => {
  await pingDatabase();
  return context.json({ status: "ok" as const });
});
