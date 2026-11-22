import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { z } from "zod";

test("receipt preview extraction omits unused nutrition and expiry without changing chat vision", async () => {
  const calls: Array<{ prompt: string; system: string; schema: z.ZodType }> = [];
  const previewLine = {
    rawText: "MILK",
    normalizedName: "Milk",
    quantity: 1,
    unit: "l",
    amount: 10,
    categorySlug: "food",
    suggestedStorageLocation: "fridge",
    estimatedShelfLifeDays: 4,
    isFoodItem: true,
    confidence: "high",
    shelfLifeDays: { fridge: 4, freezer: null, pantry: null },
  };
  const receipt = {
    kind: "receipt",
    merchant: "Shop",
    purchasedAt: null,
    currency: "HUF",
    lineItems: [previewLine, {
      ...previewLine, rawText: "SOAP", normalizedName: "Soap", categorySlug: "household",
      isFoodItem: false, suggestedStorageLocation: null, estimatedShelfLifeDays: null,
    }],
    ambiguities: [],
  };
  let response: unknown = receipt;
  const llm = mock.module("../core/llm.client", {
    namedExports: {
      generateStructuredMultimodal: async (input: { prompt: string; system: string; schema: z.ZodType }) => {
        calls.push(input);
        return { success: true, data: { output: input.schema.parse(response), usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    },
  });
  try {
    const { executeReceiptPreviewExtractor, executeVisionExtractor } = await import("./vision-extractor.skill");
    const input = {
      images: [{ mimeType: "image/png", base64Data: "YWJj" }],
      userLocale: "hu",
      defaultCurrency: "HUF",
    };
    const preview = await executeReceiptPreviewExtractor(input);
    assert.equal(preview.success, true);
    if (preview.success && preview.data.output.kind === "receipt") {
      assert.equal(preview.data.output.lineItems.length, 2);
      assert.equal(preview.data.output.lineItems[1]?.categorySlug, "household");
    } else {
      assert.fail("Expected a receipt preview");
    }
    assert.doesNotMatch(calls[0]!.prompt, /estimate calories|expiresAt/);
    assert.match(calls[0]!.system, /Hungarian/i);
    assert.equal(calls[0]!.schema.safeParse({ kind: "other" }).success, true);
    assert.equal(calls[0]!.schema.safeParse({
      ...receipt, lineItems: [{ ...previewLine, expiresAt: null }],
    }).success, false);

    response = {
      ...receipt,
      totalAmount: 20,
      lineItems: receipt.lineItems.map((line) => ({
        ...line, expiresAt: null, estimatedMacrosPerUnit: null,
      })),
    };
    const chat = await executeVisionExtractor(input);
    assert.equal(chat.success, true);
    assert.match(calls[1]!.prompt, /estimate calories/);
    assert.equal(calls[1]!.schema.safeParse(receipt).success, false);
  } finally {
    llm.restore();
  }
});
