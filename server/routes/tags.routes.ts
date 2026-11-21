import { zValidator } from "@hono/zod-validator";
import { listTagsQuerySchema, resolveTagsInputSchema } from "@app/modules/schemas";
import { tagsService } from "@app/modules";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

export const tagRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listTagsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await tagsService.listAvailable(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", resolveTagsInputSchema), async (context) =>
    resultToResponse(
      context,
      await tagsService.resolveOrCreateTags(
        context.get("userId"),
        context.req.valid("json").tags,
      ),
      201,
    ),
  );
