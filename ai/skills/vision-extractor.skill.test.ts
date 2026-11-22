import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { z } from "zod";

test("receipt extraction estimates all nutrition and image search terms in one vision request", async () => {
  const calls: Array<{ prompt: string; system: string; schema: z.ZodType }> = [];
  const macros = { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null };
  const previewLine = {
    rawText: "MILK",
    normalizedName: "Milk",
    quantity: 1,
    unit: "l",
    amount: 10,
    categorySlug: "food",
    suggestedStorageLocation: "fridge",
    estimatedShelfLifeDays: 4,
    estimatedMacrosPerUnit: macros,
    imageSearchTerm: "milk",
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
      estimatedMacrosPerUnit: null, imageSearchTerm: null,
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
      assert.deepEqual(preview.data.output.lineItems[0]?.estimatedMacrosPerUnit, macros);
      assert.equal(preview.data.output.lineItems[1]?.estimatedMacrosPerUnit, null);
    } else {
      assert.fail("Expected a receipt preview");
    }
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.prompt, /estimate calories/);
    assert.match(calls[0]!.prompt, /imageSearchTerm.*English/);
    assert.doesNotMatch(calls[0]!.prompt, /expiresAt/);
    assert.match(calls[0]!.system, /Hungarian/i);
    assert.equal(calls[0]!.schema.safeParse({ kind: "other" }).success, true);
    assert.equal(calls[0]!.schema.safeParse({
      ...receipt, lineItems: [{ ...previewLine, expiresAt: null }],
    }).success, false);

    response = {
      ...receipt,
      totalAmount: 20,
      lineItems: receipt.lineItems.map((line) => ({
        ...line, expiresAt: null,
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
