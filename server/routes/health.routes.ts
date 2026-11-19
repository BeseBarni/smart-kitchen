import { pingDatabase } from "@app/db";
import { Hono } from "hono";

export const healthRoutes = new Hono().get("/health", async (context) => {
  await pingDatabase();
  return context.json({ status: "ok" as const });
});
