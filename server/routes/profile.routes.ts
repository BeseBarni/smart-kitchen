import { zValidator } from "@hono/zod-validator";
import { profileService, updateProfileSchema } from "@app/modules";
import { Hono } from "hono";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

export const profileRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, async (context) =>
    resultToResponse(
      context,
      await profileService.getOrCreateProfile(context.get("userId")),
    ),
  )
  .patch(
    "/",
    requireAuth,
    zValidator("json", updateProfileSchema),
    async (context) =>
      resultToResponse(
        context,
        await profileService.updateProfile(
          context.get("userId"),
          context.req.valid("json"),
        ),
      ),
  );
