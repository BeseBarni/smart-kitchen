import { zValidator } from "@hono/zod-validator";
import {
  createReceiptInputSchema,
  listReceiptsQuerySchema,
  receiptReadService,
  receiptWriteService,
  updateReceiptInputSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const receiptParams = z.object({ id: z.string().uuid() });

export const receiptRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listReceiptsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await receiptReadService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/", requireAuth, zValidator("json", createReceiptInputSchema), async (context) =>
    resultToResponse(
      context,
      await receiptWriteService.create(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .get("/:id", requireAuth, zValidator("param", receiptParams), async (context) =>
    resultToResponse(
      context,
      await receiptReadService.getReceiptDetail(
        context.get("userId"),
        context.req.valid("param").id,
      ),
    ),
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", receiptParams),
    zValidator("json", updateReceiptInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await receiptWriteService.update(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .delete("/:id", requireAuth, zValidator("param", receiptParams), async (context) =>
    resultToResponse(
      context,
      await receiptWriteService.remove(context.get("userId"), context.req.valid("param").id),
    ),
  );
