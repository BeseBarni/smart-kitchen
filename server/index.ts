import { Hono } from "hono";
import { accountRoutes } from "./routes/account.routes";
import { authRoutes } from "./routes/auth.routes";

export const app = new Hono()
  .basePath("/api")
  .route("/", authRoutes)
  .route("/", accountRoutes);

export type AppType = typeof app;
