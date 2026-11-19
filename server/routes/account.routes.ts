import { getAccount } from "@app/modules";
import { Hono } from "hono";
import { authForRequest } from "../middleware/auth";

export const accountRoutes = new Hono().get("/account", async (c) => {
  const { data, error } = await authForRequest(c).getSession();
  if (error) {
    console.error("Could not verify session:", error);
    return c.json({ error: "Could not verify session." }, 502);
  }
  if (!data?.user) return c.json({ error: "Authentication required." }, 401);
  const result = await getAccount(data.user.id);
  if (!result.success) return c.json({ error: result.error.message }, 404);
  return c.json(result.data);
});
