import { zValidator } from "@hono/zod-validator";
import {
  createMerchantInputSchema,
  listMerchantsQuerySchema,
  merchantService,
  updateMerchantInputSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const merchantParams = z.object({ id: z.string().uuid() });

export const merchantRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listMerchantsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await merchantService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", createMerchantInputSchema), async (context) =>
    resultToResponse(
      context,
      await merchantService.create(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", merchantParams),
    zValidator("json", updateMerchantInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await merchantService.update(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .delete("/:id", requireAuth, zValidator("param", merchantParams), async (context) =>
    resultToResponse(
      context,
      await merchantService.remove(context.get("userId"), context.req.valid("param").id),
    ),
  );
