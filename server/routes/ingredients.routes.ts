import { zValidator } from "@hono/zod-validator";
import {
  createIngredientSchema,
  ingredientIdSchema,
  ingredientService,
  listIngredientsQuerySchema,
  updateIngredientSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const ingredientParams = z.object({ id: ingredientIdSchema });

export const ingredientRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listIngredientsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await ingredientService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", createIngredientSchema), async (context) =>
    resultToResponse(
      context,
      await ingredientService.create(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .get("/:id", requireAuth, zValidator("param", ingredientParams), async (context) =>
    resultToResponse(
      context,
      await ingredientService.getById(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", ingredientParams),
    zValidator("json", updateIngredientSchema),
    async (context) =>
      resultToResponse(
        context,
        await ingredientService.update(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .delete("/:id", requireAuth, zValidator("param", ingredientParams), async (context) =>
    resultToResponse(
      context,
      await ingredientService.remove(context.get("userId"), context.req.valid("param").id),
    ),
  );
