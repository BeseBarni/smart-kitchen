import { randomBytes } from "node:crypto";
import { err, ok, type AppError, type Result } from "@app/shared";
import { getObjectBufferForAsset } from "../media/media.service";
import { resolveEntityImages } from "../mealdb/mealdb-image.utils";
import {
  enableRecipeShare as enableRecipeShareRow,
  findPublicRecipeByToken,
  findUploadedShareImage,
  revokeRecipeShare as revokeRecipeShareRow,
} from "./recipe-share.repo";
import {
  shareTokenParamSchema,
  sharedRecipePublicDtoSchema,
  type EnableRecipeShareInput,
  type RecipeShareStatusDto,
  type SharedRecipePublicDto,
} from "./recipe-share.schema";

const notFound = (): AppError => ({ code: "ITEM_NOT_FOUND", message: "Recipe share not found." });

function statusDto(row: { shareToken: string | null; sharedAt: Date | null }): RecipeShareStatusDto {
  return {
    isShared: row.shareToken !== null && row.sharedAt !== null,
    shareToken: row.shareToken,
    sharedAt: row.sharedAt?.toISOString() ?? null,
  };
}

function publicImageUrls(token: string, recipe: {
  imageAssetId: string | null;
  imageUrl: string | null;
  stockImageKind: "themealdb_meal" | "themealdb_ingredient" | null;
  stockImageName: string | null;
}, hasUploadedImage: boolean) {
  if (recipe.imageAssetId && hasUploadedImage) {
    const url = `/api/public/recipes/${token}/image`;
    return { small: url, medium: url, large: url, source: "upload" as const };
  }
  if (recipe.stockImageKind && recipe.stockImageName) {
    const resolved = resolveEntityImages(recipe);
    if (resolved.source === "themealdb") return resolved;
  }
  if (recipe.imageUrl && isSafePublicImageUrl(recipe.imageUrl)) {
    return {
      small: recipe.imageUrl,
      medium: recipe.imageUrl,
      large: recipe.imageUrl,
      source: "legacy" as const,
    };
  }
  return { small: null, medium: null, large: null, source: "none" as const };
}

function isSafePublicImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function toPublicDto(
  token: string,
  result: NonNullable<Awaited<ReturnType<typeof findPublicRecipeByToken>>>,
): SharedRecipePublicDto | undefined {
  const { recipe } = result;
  if (!recipe.sharedAt) return undefined;
  return sharedRecipePublicDtoSchema.parse({
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    servings: Number(recipe.servings),
    calories: recipe.caloriesPerServing === null ? null : Number(recipe.caloriesPerServing),
    proteinG: recipe.proteinPerServing === null ? null : Number(recipe.proteinPerServing),
    carbsG: recipe.carbsPerServing === null ? null : Number(recipe.carbsPerServing),
    fatG: recipe.fatPerServing === null ? null : Number(recipe.fatPerServing),
    shelfLifeDays: recipe.shelfLifeDays ?? {},
    tags: result.tags.map((tag) => ({
      slug: tag.slug,
      label: tag.label,
      i18nKey: tag.i18nKey ?? null,
      category: tag.category,
      colorToken: tag.colorToken ?? null,
    })),
    ingredients: result.ingredients.map((line) => ({
      displayName: line.displayName,
      quantity: Number(line.quantity),
      unit: line.unit,
      notes: line.notes,
      sortOrder: line.sortOrder,
    })),
    imageUrls: publicImageUrls(token, recipe, result.hasUploadedImage),
    sharedAt: recipe.sharedAt.toISOString(),
  });
}

export async function enableShare(
  userId: string,
  recipeId: string,
  input: EnableRecipeShareInput = {},
): Promise<Result<RecipeShareStatusDto, AppError>> {
  const row = await enableRecipeShareRow(
    userId,
    recipeId,
    randomBytes(16).toString("base64url"),
    input.regenerate ?? false,
  );
  return row ? ok(statusDto(row)) : err(notFound());
}

export async function revokeShare(
  userId: string,
  recipeId: string,
): Promise<Result<RecipeShareStatusDto, AppError>> {
  const revoked = await revokeRecipeShareRow(userId, recipeId);
  if (!revoked) return err(notFound());
  return ok({ isShared: false, shareToken: null, sharedAt: null });
}

export async function getPublicByShareToken(
  token: string,
): Promise<Result<SharedRecipePublicDto, AppError>> {
  if (!shareTokenParamSchema.safeParse({ token }).success) return err(notFound());
  const row = await findPublicRecipeByToken(token);
  if (!row) return err(notFound());
  const dto = toPublicDto(token, row);
  return dto ? ok(dto) : err(notFound());
}

export async function getPublicImage(
  token: string,
): Promise<Result<{ bytes: Uint8Array; mimeType: string }, AppError>> {
  if (!shareTokenParamSchema.safeParse({ token }).success) return err(notFound());
  const image = await findUploadedShareImage(token);
  if (!image) return err(notFound());
  const result = await getObjectBufferForAsset(image.ownerId, image.assetId);
  if (!result.success && result.error.code === "UNAUTHORIZED") return err(notFound());
  if (result.success) {
    const stillShared = await findUploadedShareImage(token);
    if (!stillShared || stillShared.assetId !== image.assetId) return err(notFound());
  }
  return result;
}
