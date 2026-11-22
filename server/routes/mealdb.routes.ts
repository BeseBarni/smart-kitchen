import { zValidator } from "@hono/zod-validator";
import { mealDbSearchQuerySchema, mealDbService } from "@app/modules";
import { normalizeMealDbSearch } from "@app/ai/mealdb-search";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const mealIdParams = z.object({ mealId: z.string().regex(/^\d+$/).describe("TheMealDB numeric meal ID.") });

export const mealDbRoutes = new Hono<AuthEnvironment>()
  .get(
    "/images/search",
    requireAuth,
    zValidator("query", mealDbSearchQuerySchema),
    async (context) => {
      const input = context.req.valid("query");
      const translated = await normalizeMealDbSearch({
        kind: input.kind, query: input.q, ...(input.mainIngredient ? { mainIngredient: input.mainIngredient } : {}),
      });
      if (!translated.success) return resultToResponse(context, translated);
      if (input.kind === "ingredient") {
        return resultToResponse(
          context,
          await mealDbService.searchIngredientImages(translated.data.output.query, input.limit),
        );
      }
      return resultToResponse(
        context,
        await mealDbService.searchMealImages(translated.data.output.query, {
          mainIngredient: translated.data.output.mainIngredient,
          limit: input.limit,
        }),
      );
    },
  )
  .get(
    "/meals/:mealId",
    requireAuth,
    zValidator("param", mealIdParams),
    async (context) =>
      resultToResponse(
        context,
        await mealDbService.getMealDetails(context.req.valid("param").mealId),
      ),
  );
