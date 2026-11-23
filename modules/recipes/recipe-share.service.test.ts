import assert from "node:assert/strict";
import { after, test, mock } from "node:test";

const shareToken = "A".repeat(22);
const sharedAt = new Date("2026-01-02T03:04:05.000Z");
let publicRow: unknown;
let imageLookups = 0;
let revoked = false;
let revokeWhileReading = false;

const repoMock = mock.module(new URL("./recipe-share.repo.ts", import.meta.url), {
  namedExports: {
    enableRecipeShare: async (_userId: string, _recipeId: string, token: string, regenerate: boolean) => ({
      shareToken: regenerate ? token : shareToken,
      sharedAt,
    }),
    revokeRecipeShare: async () => !revoked,
    findPublicRecipeByToken: async () => publicRow,
    findUploadedShareImage: async () => {
      imageLookups += 1;
      return revoked ? undefined : { ownerId: "private-owner", assetId: "private-asset" };
    },
  },
});
const mediaMock = mock.module(new URL("../media/media.service.ts", import.meta.url), {
  namedExports: {
    getObjectBufferForAsset: async () => {
      if (revokeWhileReading) revoked = true;
      return {
        success: true,
        data: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
      };
    },
  },
});
const shareService = await import("./recipe-share.service");

after(() => {
  repoMock.restore();
  mediaMock.restore();
});

test("owner operations return canonical share status and revoke cleanly", async () => {
  const enabled = await shareService.enableShare("owner-id", "recipe-id");
  assert.equal(enabled.success, true);
  if (!enabled.success) return;
  assert.match(enabled.data.shareToken ?? "", /^[A-Za-z0-9_-]{21}[AQgw]$/);
  assert.equal(enabled.data.isShared, true);

  const result = await shareService.revokeShare("owner-id", "recipe-id");
  assert.deepEqual(result, {
    success: true,
    data: { isShared: false, shareToken: null, sharedAt: null },
  });
});

test("public recipe mapping omits private owner, cost, and linked ingredient data", async () => {
  publicRow = {
    recipe: {
      userId: "private-owner",
      title: "Lentil soup",
      description: null,
      instructions: ["Simmer."],
      prepTimeMin: 5,
      cookTimeMin: 20,
      servings: "2.00",
      caloriesPerServing: "120.00",
      proteinPerServing: "8.00",
      carbsPerServing: "16.00",
      fatPerServing: "2.00",
      costPerServing: "999.00",
      shelfLifeDays: { fridge: 3 },
      shareToken,
      sharedAt,
      imageAssetId: null,
      imageUrl: null,
      stockImageKind: null,
      stockImageName: null,
    },
    tags: [{ slug: "vegetarian", label: "Vegetarian", i18nKey: null, category: "dietary", colorToken: null, userId: "private-owner" }],
    ingredients: [{
      displayName: "Lentils",
      quantity: "100.00",
      unit: "g",
      notes: null,
      sortOrder: 0,
      userId: "private-owner",
      priceAmount: 999,
    }],
    hasUploadedImage: false,
  };
  const result = await shareService.getPublicByShareToken(shareToken);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(Object.keys(result.data).sort(), [
    "title", "description", "instructions", "prepTimeMin", "cookTimeMin", "servings",
    "calories", "proteinG", "carbsG", "fatG", "shelfLifeDays", "tags", "ingredients",
    "imageUrls", "sharedAt",
  ].sort());
  assert.equal("userId" in result.data.tags[0]!, false);
  assert.equal("userId" in result.data.ingredients[0]!, false);
  assert.equal("priceAmount" in result.data.ingredients[0]!, false);
});

test("missing and revoked shares return not-found without disclosing recipe existence", async () => {
  publicRow = undefined;
  const missing = await shareService.getPublicByShareToken(shareToken);
  assert.deepEqual(missing, {
    success: false,
    error: { code: "ITEM_NOT_FOUND", message: "Recipe share not found." },
  });
  const malformed = await shareService.getPublicByShareToken("not-a-token");
  assert.equal(malformed.success, false);
});

test("uploaded cover retrieval rechecks the share before returning bytes", async () => {
  imageLookups = 0;
  revoked = false;
  revokeWhileReading = false;
  const result = await shareService.getPublicImage(shareToken);
  assert.equal(result.success, true);
  assert.equal(imageLookups, 2);
  if (result.success) assert.deepEqual([...result.data.bytes], [1, 2, 3]);

  imageLookups = 0;
  revoked = false;
  revokeWhileReading = true;
  const revokedResult = await shareService.getPublicImage(shareToken);
  assert.deepEqual(revokedResult, {
    success: false,
    error: { code: "ITEM_NOT_FOUND", message: "Recipe share not found." },
  });
  assert.equal(imageLookups, 2);
});
