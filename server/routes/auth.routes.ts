import { handleAuthProxyRequest } from "@neon/auth/server";
import { Hono } from "hono";
import { authConfig, authLog } from "../middleware/auth";

export const authRoutes = new Hono().all("/auth/*", (c) =>
  handleAuthProxyRequest({
    ...authConfig(),
    request: c.req.raw,
    path: c.req.path.slice("/api/auth/".length),
    log: authLog,
  }),
);
