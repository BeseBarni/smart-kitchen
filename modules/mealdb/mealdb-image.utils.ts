import type { ResolvedImageUrls, StockImageKind } from "./mealdb.schema";

export type ImageEntity = {
  imageAssetId?: string | null;
  stockImageKind?: StockImageKind | null;
  stockImageName?: string | null;
  imageUrl?: string | null;
};

export function isSafeMealDbImageName(imageName: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(imageName)
    && !imageName.includes("..")
    && !imageName.includes("/");
}

export function isSafeMealDbIngredientName(imageName: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,254}$/.test(imageName);
}

export function resolveMealDbImageUrl(
  kind: StockImageKind,
  imageName: string,
  size: "small" | "medium" | "large" = "medium",
): string | null {
  if (kind === "themealdb_meal") {
    if (!isSafeMealDbImageName(imageName)) return null;
    return `https://www.themealdb.com/images/media/meals/${encodeURIComponent(imageName)}/${size}`;
  }
  if (!isSafeMealDbIngredientName(imageName)) return null;
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(imageName)}-${size}.png`;
}

export function resolveEntityImages(entity: ImageEntity): ResolvedImageUrls {
  if (entity.imageAssetId) {
    const uploadUrl = `/api/media/${encodeURIComponent(entity.imageAssetId)}/file`;
    return { small: uploadUrl, medium: uploadUrl, large: uploadUrl, source: "upload" };
  }
  if (entity.stockImageKind && entity.stockImageName) {
    const small = resolveMealDbImageUrl(entity.stockImageKind, entity.stockImageName, "small");
    const medium = resolveMealDbImageUrl(entity.stockImageKind, entity.stockImageName, "medium");
    const large = resolveMealDbImageUrl(entity.stockImageKind, entity.stockImageName, "large");
    if (small && medium && large) {
      return { small, medium, large, source: "themealdb" };
    }
  }
  if (entity.imageUrl) {
    return { small: entity.imageUrl, medium: entity.imageUrl, large: entity.imageUrl, source: "legacy" };
  }
  return { small: null, medium: null, large: null, source: "none" };
}

export function extractMealDbMealImageName(strMealThumb: string): string | null {
  try {
    const url = new URL(strMealThumb);
    if (url.protocol !== "https:" || url.hostname !== "www.themealdb.com") return null;
    const match = url.pathname.match(/^\/images\/media\/meals\/([^/]+)(?:\/(?:small|medium|large))?$/);
    if (!match) return null;
    const name = decodeURIComponent(match[1] ?? "");
    return isSafeMealDbImageName(name) ? name : null;
  } catch {
    return null;
  }
}

export function normalizeMealDbIngredientImageName(strIngredient: string): string {
  return strIngredient
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
