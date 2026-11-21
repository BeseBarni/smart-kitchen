import { zValidator } from "@hono/zod-validator";
import { mediaService, presignUploadInputSchema } from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const mediaParams = z.object({ id: z.string().uuid() });

export const mediaRoutes = new Hono<AuthEnvironment>()
  .post(
    "/presign",
    requireAuth,
    zValidator("json", presignUploadInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await mediaService.requestUploadUrl(context.get("userId"), context.req.valid("json")),
      ),
  )
  .post(
    "/:id/confirm",
    requireAuth,
    zValidator("param", mediaParams),
    async (context) =>
      resultToResponse(
        context,
        await mediaService.confirmUpload(context.get("userId"), context.req.valid("param").id),
      ),
  )
  .get(
    "/:id/file",
    requireAuth,
    zValidator("param", mediaParams),
    async (context) => {
      const resolved = await mediaService.resolveReadableUrl(
        context.req.param("id"),
        context.get("userId"),
      );
      if (!resolved.success) return resultToResponse(context, resolved);
      context.header("Cache-Control", "private, max-age=60");
      return context.redirect(resolved.data, 302);
    },
  )
  .delete(
    "/:id",
    requireAuth,
    zValidator("param", mediaParams),
    async (context) =>
      resultToResponse(
        context,
        await mediaService.softDeleteAndPurge(context.get("userId"), context.req.valid("param").id),
      ),
  );
