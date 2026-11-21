import { zValidator } from "@hono/zod-validator";
import {
  createMealLogSchema,
  dailySummaryQuerySchema,
  deleteMealLogQuerySchema,
  listMealLogsQuerySchema,
  mealLogIdSchema,
  mealLogService,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const mealLogParams = z.object({ id: mealLogIdSchema });

export const mealLogRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listMealLogsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await mealLogService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .get("/daily-summary", requireAuth, zValidator("query", dailySummaryQuerySchema), async (context) =>
    resultToResponse(
      context,
      await mealLogService.getDailySummary(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", createMealLogSchema), async (context) =>
    resultToResponse(
      context,
      await mealLogService.createManualLog(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .delete(
    "/:id",
    requireAuth,
    zValidator("param", mealLogParams),
    zValidator("query", deleteMealLogQuerySchema),
    async (context) =>
      resultToResponse(
        context,
        await mealLogService.remove(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("query").restoreInventory,
          context.req.valid("query").requireInventory,
        ),
      ),
  );
