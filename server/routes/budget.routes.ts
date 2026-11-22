import { zValidator } from "@hono/zod-validator";
import {
  budgetService,
  budgetSummaryQuerySchema,
  expenseCategoriesService,
  upsertMonthlyBudgetInputSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const budgetParams = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const budgetRoutes = new Hono<AuthEnvironment>()
  .get("/expense-categories", requireAuth, async (context) =>
    resultToResponse(
      context,
      await expenseCategoriesService.listAvailable(context.get("userId")),
    ),
  )
  .get("/budget/summary", requireAuth, zValidator("query", budgetSummaryQuerySchema), async (context) =>
    resultToResponse(
      context,
      await budgetService.getMonthlySummary(context.get("userId"), context.req.valid("query")),
    ),
  )
  .put(
    "/budget/:yearMonth",
    requireAuth,
    zValidator("param", budgetParams),
    zValidator("json", upsertMonthlyBudgetInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await budgetService.upsertMonthlyBudget(
          context.get("userId"),
          context.req.valid("param").yearMonth,
          context.req.valid("json"),
        ),
      ),
  );
