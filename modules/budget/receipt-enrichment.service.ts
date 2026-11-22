import { err, ok, type AppError, type Result } from "@app/shared";
import * as categoriesService from "./expense-categories.service";
import * as merchantsService from "./merchants.service";
import { listWithStats as listMerchants } from "./merchants.repo";
import { normalizeMerchantName } from "./merchant-normalize.utils";
import { searchIngredientImages } from "../mealdb/mealdb.service";
import type { ExtractedReceiptItemPreview } from "./receipts.schema";

export type RawReceiptLine = {
  rawText: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  amount: number;
  categorySlug: string;
  isFoodItem: boolean;
  suggestedStorageLocation: "fridge" | "freezer" | "pantry" | null;
  estimatedShelfLifeDays: number | null;
  shelfLifeDays: { fridge?: number | null; freezer?: number | null; pantry?: number | null };
  suggestedTags: Array<{ slug?: string; label: string; category?: "dietary" | "nutrition" | "prep" | "flavor" | "custom" }>;
  confidence: "high" | "medium" | "low";
};

function cleanMerchantName(raw: string): string {
  return raw
    .replace(/\b(Bt\.?|Kft\.?|Zrt\.?|Ltd\.?|Inc\.?|GmbH|LLC)\b/gi, "")
    .replace(/[\s,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveMerchant(
  userId: string,
  rawMerchant: string | null,
): Promise<{ merchantName: string | null; matchedMerchantId: string | null; matchedMerchantName: string | null }> {
  if (!rawMerchant) return { merchantName: null, matchedMerchantId: null, matchedMerchantName: null };
  const merchantName = cleanMerchantName(rawMerchant);
  const normalized = normalizeMerchantName(merchantName);
  const merchants = await listMerchants(userId, { sort: "recommended", limit: 50 });
  if (!merchants.success) return { merchantName, matchedMerchantId: null, matchedMerchantName: null };
  const exact = merchants.data.find((merchant) => merchant.normalizedName === normalized);
  if (exact) return { merchantName: exact.name, matchedMerchantId: exact.id, matchedMerchantName: exact.name };
  const prefix = normalized.length >= 3
    ? merchants.data.find((merchant) =>
      normalized.startsWith(merchant.normalizedName) ||
      merchant.normalizedName.startsWith(normalized))
    : undefined;
  if (prefix) return { merchantName: prefix.name, matchedMerchantId: prefix.id, matchedMerchantName: prefix.name };
  return { merchantName, matchedMerchantId: null, matchedMerchantName: null };
}

export async function enrichReceiptPreview(
  userId: string,
  input: {
    mediaAssetId: string;
    mediaUrl: string;
    merchant: string | null;
    purchasedAt: string | null;
    currency: string;
    ambiguities: string[];
    lines: RawReceiptLine[];
  },
): Promise<Result<{
  mediaAssetId: string;
  mediaUrl: string;
  merchantName: string | null;
  matchedMerchantId: string | null;
  matchedMerchantName: string | null;
  purchasedAt: string;
  currency: string;
  ambiguities: string[];
  items: ExtractedReceiptItemPreview[];
}, AppError>> {
  const categories = await categoriesService.listAvailable(userId);
  if (!categories.success) return categories;
  if (categories.data.length === 0) {
    return err({ code: "INTERNAL_ERROR", message: "Expense categories have not been initialized." });
  }
  const merchant = await resolveMerchant(userId, input.merchant);
  const other = categories.data.find((category) => category.slug === "other") ?? categories.data[0];
  const imageResults = await Promise.all(input.lines.map((line) =>
    line.isFoodItem ? searchIngredientImages(line.normalizedName, 1) : null,
  ));
  const imageError = imageResults.find((result) => result && !result.success);
  if (imageError && !imageError.success) {
    console.warn("Receipt ingredient image lookup failed:", imageError.error.message);
  }
  const items: ExtractedReceiptItemPreview[] = [];
  for (const [index, line] of input.lines.entries()) {
    const category = categories.data.find((entry) => entry.slug === line.categorySlug) ?? other;
    let stockImageKind: "themealdb_meal" | "themealdb_ingredient" | undefined;
    let stockImageName: string | undefined;
    const images = imageResults[index];
    if (images?.success && images.data[0]) {
      stockImageKind = "themealdb_ingredient";
      stockImageName = images.data[0].stockImageName;
    }
    items.push({
      tempId: `receipt-${index}`,
      rawReceiptText: line.rawText,
      name: line.normalizedName,
      quantity: line.quantity,
      unit: line.unit,
      amount: line.amount,
      categoryId: category?.id ?? "",
      categorySlug: category?.slug ?? "other",
      isFoodItem: line.isFoodItem,
      addToInventory: line.isFoodItem,
      storageLocation: line.suggestedStorageLocation ?? "pantry",
      estimatedShelfLifeDays: line.estimatedShelfLifeDays,
      shelfLifeDays: line.shelfLifeDays,
      suggestedTags: line.suggestedTags.slice(0, 3),
      ...(stockImageKind ? { stockImageKind } : {}),
      ...(stockImageName ? { stockImageName } : {}),
      confidence: line.confidence,
    });
  }
  return ok({
    mediaAssetId: input.mediaAssetId,
    mediaUrl: input.mediaUrl,
    ...merchant,
    purchasedAt: input.purchasedAt ?? new Date().toISOString(),
    currency: input.currency,
    ambiguities: input.ambiguities,
    items,
  });
}
