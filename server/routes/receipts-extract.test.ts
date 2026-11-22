import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Context, Next } from "hono";

test("receipt extraction overlaps media loading and context queries after ownership validation", async () => {
  const modules = await import("@app/modules");
  let releaseObject!: () => void;
  const objectReady = new Promise<void>((resolve) => { releaseObject = resolve; });
  let objectStarted!: () => void;
  const started = new Promise<void>((resolve) => { objectStarted = resolve; });
  let categoriesStarted = false;
  let merchantsStarted = false;
  let owned = false;
  let extractionKind: "receipt" | "other" = "receipt";
  let enrichedLines: unknown;
  let extractedLocale: string | undefined;
  const modulesMock = mock.module("@app/modules", {
    namedExports: {
      ...modules,
      mediaService: {
        assertOwnedUploadedAssets: async () => { owned = true; return { success: true, data: [] }; },
        getObjectBufferForAsset: async () => {
          assert.equal(owned, true);
          objectStarted();
          await objectReady;
          return { success: true, data: { bytes: new Uint8Array([1]), mimeType: "image/png" } };
        },
        resolveReadableUrl: async () => ({ success: true, data: "https://example.com/image" }),
      },
      expenseCategoriesService: {
        listAvailable: async () => {
          assert.equal(owned, true);
          categoriesStarted = true;
          return { success: true, data: [{ slug: "food", label: "Food" }] };
        },
      },
      merchantService: {
        list: async () => {
          assert.equal(owned, true);
          merchantsStarted = true;
          return { success: true, data: [] };
        },
      },
      receiptEnrichmentService: {
        enrichReceiptPreview: async (_userId: string, input: { lines: unknown }) => {
          enrichedLines = input.lines;
          return { success: true, data: { items: input.lines } };
        },
      },
    },
  });
  const authMock = mock.module("../middleware/auth.middleware", {
    namedExports: {
      requireAuth: async (context: Context, next: Next) => {
        context.set("userId", "owner");
        await next();
      },
    },
  });
  const aiMock = mock.module("@app/ai", {
    namedExports: {
      executeReceiptPreviewExtractor: async (input: { userLocale?: string }) => {
        extractedLocale = input.userLocale;
        return {
          success: true,
          data: {
            output: extractionKind === "other" ? { kind: "other" } : {
              kind: "receipt", merchant: null, purchasedAt: null, currency: "HUF", ambiguities: [],
              lineItems: [{
                rawText: "MILK", normalizedName: "Milk", quantity: 1, unit: "l", amount: 10,
                categorySlug: "food", isFoodItem: true, suggestedStorageLocation: "fridge",
                estimatedShelfLifeDays: 4, shelfLifeDays: { fridge: 4 }, confidence: "high",
              }],
            },
          },
        };
      },
    },
  });
  try {
    const { receiptRoutes } = await import("./receipts.routes");
    const request = () => receiptRoutes.request("/extract-from-media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaAssetId: "00000000-0000-4000-8000-000000000001", userLocale: "hu" }),
    });
    const pending = request();
    await started;
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(categoriesStarted, true);
    assert.equal(merchantsStarted, true);
    releaseObject();
    assert.equal((await pending).status, 200);
    assert.equal(Array.isArray(enrichedLines) && enrichedLines.length, 1);
    assert.equal(extractedLocale, "hu");

    extractionKind = "other";
    assert.equal((await request()).status, 422);
  } finally {
    releaseObject();
    aiMock.restore();
    authMock.restore();
    modulesMock.restore();
  }
});
