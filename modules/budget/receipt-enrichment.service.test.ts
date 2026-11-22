import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("receipt enrichment shares a catalog request across food lines, including on failure", async () => {
  const categories = mock.module("./expense-categories.service", {
    namedExports: {
      listAvailable: async () => ({
        success: true,
        data: [
          { id: "00000000-0000-4000-8000-000000000001", slug: "food" },
          { id: "00000000-0000-4000-8000-000000000002", slug: "other" },
        ],
      }),
    },
  });
  let fetches = 0;
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    fetches += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (fetches === 1) return new Response(null, { status: 503 });
    return Response.json({
      meals: [
        { idIngredient: "1", strIngredient: "Chicken" },
        { idIngredient: "2", strIngredient: "Tomato" },
      ],
    });
  });
  const warnings = mock.method(console, "warn", () => {});

  try {
    const { enrichReceiptPreview } = await import("./receipt-enrichment.service");
    const foodLine = {
      rawText: "CHICKEN",
      normalizedName: "Chicken",
      quantity: 1,
      unit: "piece",
      amount: 10,
      categorySlug: "food",
      isFoodItem: true,
      suggestedStorageLocation: "fridge" as const,
      estimatedShelfLifeDays: 2,
      shelfLifeDays: { fridge: 2 },
      suggestedTags: [],
      confidence: "high" as const,
    };
    const input = {
      mediaAssetId: "00000000-0000-4000-8000-000000000003",
      mediaUrl: "https://example.com/receipt",
      merchant: null,
      purchasedAt: "2026-01-01T00:00:00.000Z",
      currency: "HUF",
      ambiguities: [],
      lines: [
        { ...foodLine, normalizedName: "Tomato" },
        ...Array.from({ length: 14 }, () => foodLine),
        { ...foodLine, normalizedName: "Bag", categorySlug: "other", isFoodItem: false },
      ],
    };
    const nonFood = await enrichReceiptPreview("user", { ...input, lines: [input.lines[15]!] });
    assert.equal(nonFood.success, true);
    assert.equal(fetches, 0);

    const failedCatalog = await enrichReceiptPreview("user", input);
    assert.equal(fetches, 1);
    assert.equal(warnings.mock.callCount(), 1);
    assert.equal(failedCatalog.success, true);
    if (!failedCatalog.success) return;
    assert.equal(failedCatalog.data.items.length, 16);
    assert.ok(failedCatalog.data.items.every((item) => item.stockImageName === undefined));

    const recovered = await enrichReceiptPreview("user", input);
    assert.equal(fetches, 2);
    assert.equal(recovered.success, true);
    if (!recovered.success) return;
    assert.equal(recovered.data.items[0]?.stockImageName, "tomato");
    assert.equal(recovered.data.items[1]?.stockImageName, "chicken");
    assert.equal(recovered.data.items[15]?.stockImageName, undefined);
  } finally {
    warnings.mock.restore();
    fetchMock.mock.restore();
    categories.restore();
  }
});
