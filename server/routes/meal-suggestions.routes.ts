import { zValidator } from "@hono/zod-validator";
import { dailyMealSuggestionsSkill } from "@app/ai";
import { mealSuggestionsRequestSchema, mealSuggestionsService } from "@app/modules";
import { ok } from "@app/shared";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

export const mealSuggestionsRoutes = new Hono<AuthEnvironment>()
  .post("/", requireAuth, zValidator("json", mealSuggestionsRequestSchema), async (context) => {
    const input = context.req.valid("json");
    if (input.from === undefined || input.to === undefined) {
      return resultToResponse(context, { success: false, error: { code: "VALIDATION_ERROR", message: "Local-day bounds are required." } });
    }
    const prepared = await mealSuggestionsService.buildSuggestionContext(context.get("userId"), { date: input.date, from: input.from, to: input.to });
    if (!prepared.success) return resultToResponse(context, prepared);
    if (prepared.data.stock.length === 0) return resultToResponse(context, ok({ suggestions: [], note: "Add stock to receive suggestions." }));
    const generated = await dailyMealSuggestionsSkill.execute(prepared.data, () => {});
    if (!generated.success) return resultToResponse(context, generated);
    return resultToResponse(context, mealSuggestionsService.validateSuggestions(prepared.data, generated.data.output));
  });
