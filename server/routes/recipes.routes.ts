import { zValidator } from "@hono/zod-validator";
import {
  cookRecipeInputSchema,
  createRecipeSchema,
  listRecipesQuerySchema,
  recipeIdSchema,
  recipeService,
  updateRecipeSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const recipeParams = z.object({ id: recipeIdSchema });

export const recipeRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listRecipesQuerySchema), async (context) =>
    resultToResponse(
      context,
      await recipeService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", createRecipeSchema), async (context) =>
    resultToResponse(
      context,
      await recipeService.create(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .get("/:id", requireAuth, zValidator("param", recipeParams), async (context) =>
    resultToResponse(
      context,
      await recipeService.getById(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", recipeParams),
    zValidator("json", updateRecipeSchema),
    async (context) =>
      resultToResponse(
        context,
        await recipeService.update(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .delete("/:id", requireAuth, zValidator("param", recipeParams), async (context) =>
    resultToResponse(
      context,
      await recipeService.remove(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .post(
    "/:id/cook",
    requireAuth,
    zValidator("param", recipeParams),
    zValidator("json", cookRecipeInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await recipeService.cookAndStock(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        201,
      ),
  );
