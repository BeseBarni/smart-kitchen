import { zValidator } from "@hono/zod-validator";
import {
  adjustInventoryInputSchema,
  batchCreateInventoryInputSchema,
  consumeInventoryInputSchema,
  createInventoryItemSchema,
  expiringInventoryQuerySchema,
  inventoryItemIdSchema,
  inventoryService,
  listInventoryQuerySchema,
  updateInventoryItemSchema,
  switchStorageLocationSchema,
} from "@app/modules";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const inventoryParams = z.object({ id: inventoryItemIdSchema });

export const inventoryRoutes = new Hono<AuthEnvironment>()
  .get("/", requireAuth, zValidator("query", listInventoryQuerySchema), async (context) =>
    resultToResponse(
      context,
      await inventoryService.list(context.get("userId"), context.req.valid("query")),
    ),
  )
  .get("/summary", requireAuth, async (context) =>
    resultToResponse(context, await inventoryService.getSummary(context.get("userId"))),
  )
  .get("/expiring", requireAuth, zValidator("query", expiringInventoryQuerySchema), async (context) =>
    resultToResponse(
      context,
      await inventoryService.listExpiring(
        context.get("userId"),
        context.req.valid("query").withinHours,
      ),
    ),
  )
  .post("/", requireAuth, zValidator("json", createInventoryItemSchema), async (context) =>
    resultToResponse(
      context,
      await inventoryService.create(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .post("/batch", requireAuth, zValidator("json", batchCreateInventoryInputSchema), async (context) =>
    resultToResponse(
      context,
      await inventoryService.createBatch(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .get("/:id", requireAuth, zValidator("param", inventoryParams), async (context) =>
    resultToResponse(
      context,
      await inventoryService.getById(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", inventoryParams),
    zValidator("json", updateInventoryItemSchema),
    async (context) =>
      resultToResponse(
        context,
        await inventoryService.update(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .patch(
    "/:id/storage",
    requireAuth,
    zValidator("param", inventoryParams),
    zValidator("json", switchStorageLocationSchema),
    async (context) =>
      resultToResponse(
        context,
        await inventoryService.switchStorageLocation(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .delete("/:id", requireAuth, zValidator("param", inventoryParams), async (context) =>
    resultToResponse(
      context,
      await inventoryService.remove(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .patch(
    "/:id/adjust",
    requireAuth,
    zValidator("param", inventoryParams),
    zValidator("json", adjustInventoryInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await inventoryService.adjustQuantity(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json").delta,
        ),
      ),
  )
  .post(
    "/:id/consume",
    requireAuth,
    zValidator("param", inventoryParams),
    zValidator("json", consumeInventoryInputSchema),
    async (context) =>
      resultToResponse(
        context,
        await inventoryService.consumePortion(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
      ),
  )
  .post("/:id/discard", requireAuth, zValidator("param", inventoryParams), async (context) =>
    resultToResponse(
      context,
      await inventoryService.discardItem(context.get("userId"), context.req.valid("param").id),
    ),
  );
