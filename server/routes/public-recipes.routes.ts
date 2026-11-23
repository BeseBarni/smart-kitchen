import { zValidator } from "@hono/zod-validator";
import { recipeShareService, shareTokenParamSchema } from "@app/modules";
import { Hono } from "hono";
import { resultToResponse } from "../middleware/error-handler";

export const publicRecipeRoutes = new Hono()
  .use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  })
  .get(
    "/:token/image",
    zValidator("param", shareTokenParamSchema),
    async (context) => {
      const { token } = context.req.valid("param");
      const result = await recipeShareService.getPublicImage(token);
      if (!result.success) return resultToResponse(context, result);
      context.header("X-Content-Type-Options", "nosniff");
      context.header("Content-Type", result.data.mimeType);
      context.header("Content-Disposition", "inline");
      return context.body(new Uint8Array(result.data.bytes), 200);
    },
  )
  .get(
    "/:token",
    zValidator("param", shareTokenParamSchema),
    async (context) => {
      const result = await recipeShareService.getPublicByShareToken(context.req.valid("param").token);
      if (!result.success) return resultToResponse(context, result);
      return context.json({ data: result.data }, 200);
    },
  );
