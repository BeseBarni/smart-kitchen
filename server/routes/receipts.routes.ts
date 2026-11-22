import { zValidator } from "@hono/zod-validator";
import {
  createReceiptInputSchema,
  commitScannedReceiptInputSchema,
  extractReceiptFromMediaInputSchema,
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
import {
  expenseCategoriesService,
  mediaService,
  merchantService,
  receiptEnrichmentService,
} from "@app/modules";
import { executeReceiptPreviewExtractor } from "@app/ai";

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
  )
  .post("/extract-from-media", requireAuth, zValidator("json", extractReceiptFromMediaInputSchema), async (context) => {
    const userId = context.get("userId");
    const input = context.req.valid("json");
    const owned = await mediaService.assertOwnedUploadedAssets(userId, [input.mediaAssetId], "receipt_scan");
    if (!owned.success) return resultToResponse(context, owned);
    const [object, categories, merchants] = await Promise.all([
      mediaService.getObjectBufferForAsset(userId, input.mediaAssetId),
      expenseCategoriesService.listAvailable(userId),
      merchantService.list(userId, { sort: "recommended", limit: 20 }),
    ]);
    if (!object.success) return resultToResponse(context, object);
    const mime = object.data.mimeType;
    if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp" &&
      mime !== "image/avif" && mime !== "image/heic" && mime !== "image/heif") {
      return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported receipt image format." } }, 422);
    }
    if (!categories.success) return resultToResponse(context, categories);
    if (!merchants.success) return resultToResponse(context, merchants);
    const extraction = await executeReceiptPreviewExtractor({
      images: [{ mimeType: mime, base64Data: Buffer.from(object.data.bytes).toString("base64") }],
      userCaption: undefined,
      userLocale: input.userLocale ?? "en",
      defaultCurrency: "HUF",
      availableCategories: categories.data.map((category) => ({ slug: category.slug, label: category.label })),
      knownMerchants: merchants.data.map((merchant) => merchant.name),
    });
    if (!extraction.success) return resultToResponse(context, extraction);
    if (extraction.data.output.kind !== "receipt") {
      return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "The image is not a receipt." } }, 422);
    }
    const output = extraction.data.output;
    const mediaUrl = await mediaService.resolveReadableUrl(input.mediaAssetId, userId);
    if (!mediaUrl.success) return resultToResponse(context, mediaUrl);
    const lines = output.lineItems.map((item) => ({
      rawText: item.rawText,
      normalizedName: item.normalizedName,
      quantity: item.quantity,
      unit: item.unit,
      amount: item.amount,
      categorySlug: item.categorySlug,
      isFoodItem: item.isFoodItem,
      suggestedStorageLocation: item.suggestedStorageLocation,
      estimatedShelfLifeDays: item.estimatedShelfLifeDays,
      shelfLifeDays: item.shelfLifeDays,
      suggestedTags: item.suggestedTags ?? [],
      confidence: item.confidence,
    }));
    const preview = await receiptEnrichmentService.enrichReceiptPreview(userId, {
      mediaAssetId: input.mediaAssetId,
      mediaUrl: mediaUrl.data,
      merchant: output.merchant,
      purchasedAt: output.purchasedAt,
      currency: output.currency,
      ambiguities: output.ambiguities,
      lines,
    });
    return resultToResponse(context, preview);
  })
  .post("/commit-scan", requireAuth, zValidator("json", commitScannedReceiptInputSchema), async (context) =>
    resultToResponse(
      context,
      await receiptWriteService.commitScannedReceipt(context.get("userId"), context.req.valid("json")),
      201,
    ),
  );
