import { zValidator } from "@hono/zod-validator";
import { addShoppingItemsSchema, compareShoppingItemsSchema, shoppingService } from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

export const shoppingRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, async (context) =>
    resultToResponse(context, await shoppingService.list(context.get("userId"))))
  .post("/", requireAuth, zValidator("json", addShoppingItemsSchema), async (context) =>
    resultToResponse(context, await shoppingService.add(context.get("userId"), context.req.valid("json").items)))
  .post("/compare", requireAuth, zValidator("json", compareShoppingItemsSchema), async (context) =>
    resultToResponse(context, await shoppingService.compare(context.get("userId"), context.req.valid("json").items)))
  .delete("/:id", requireAuth, zValidator("param", z.object({ id: z.string().uuid() })), async (context) =>
    resultToResponse(context, await shoppingService.remove(context.get("userId"), context.req.valid("param").id)));
