import { and, asc, eq, isNotNull } from "drizzle-orm";
import {
  getDatabase,
  mediaAssets,
  recipeIngredients,
  recipeTags,
  recipes,
  tags,
} from "@app/db";

export async function enableRecipeShare(
  userId: string,
  recipeId: string,
  token: string,
  regenerate: boolean,
) {
  return getDatabase().transaction(async (tx) => {
    const [existing] = await tx
      .select({ shareToken: recipes.shareToken, sharedAt: recipes.sharedAt })
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.id, recipeId)))
      .for("update")
      .limit(1);
    if (!existing) return undefined;
    if (existing.shareToken && existing.sharedAt && !regenerate) return existing;

    const sharedAt = new Date();
    const [updated] = await tx
      .update(recipes)
      .set({ shareToken: token, sharedAt, updatedAt: sharedAt })
      .where(and(eq(recipes.userId, userId), eq(recipes.id, recipeId)))
      .returning({ shareToken: recipes.shareToken, sharedAt: recipes.sharedAt });
    return updated;
  });
}

export async function revokeRecipeShare(userId: string, recipeId: string): Promise<boolean> {
  const rows = await getDatabase()
    .update(recipes)
    .set({ shareToken: null, sharedAt: null, updatedAt: new Date() })
    .where(and(eq(recipes.userId, userId), eq(recipes.id, recipeId)))
    .returning({ id: recipes.id });
  return rows.length > 0;
}

export async function findPublicRecipeByToken(token: string) {
  const [recipe] = await getDatabase()
    .select()
    .from(recipes)
    .where(and(
      eq(recipes.shareToken, token),
      isNotNull(recipes.shareToken),
      isNotNull(recipes.sharedAt),
    ))
    .limit(1);
  if (!recipe) return undefined;

  const [ingredients, recipeTagRows, uploadedImages] = await Promise.all([
    getDatabase()
      .select({
        displayName: recipeIngredients.displayName,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        notes: recipeIngredients.notes,
        sortOrder: recipeIngredients.sortOrder,
      })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipe.id))
      .orderBy(asc(recipeIngredients.sortOrder), asc(recipeIngredients.id)),
    getDatabase()
      .select({
        slug: tags.slug,
        label: tags.label,
        i18nKey: tags.i18nKey,
        category: tags.category,
        colorToken: tags.colorToken,
      })
      .from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(eq(recipeTags.recipeId, recipe.id))
      .orderBy(asc(tags.category), asc(tags.label))
      .limit(3),
    recipe.imageAssetId
      ? getDatabase()
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(
          eq(mediaAssets.id, recipe.imageAssetId),
          eq(mediaAssets.status, "uploaded"),
          eq(mediaAssets.purpose, "recipe_cover"),
        ))
        .limit(1)
      : Promise.resolve([]),
  ]);
  return { recipe, ingredients, tags: recipeTagRows, hasUploadedImage: uploadedImages.length > 0 };
}

export async function findUploadedShareImage(token: string) {
  const [image] = await getDatabase()
    .select({ ownerId: recipes.userId, assetId: mediaAssets.id })
    .from(recipes)
    .innerJoin(mediaAssets, eq(recipes.imageAssetId, mediaAssets.id))
    .where(and(
      eq(recipes.shareToken, token),
      isNotNull(recipes.shareToken),
      isNotNull(recipes.sharedAt),
      eq(mediaAssets.status, "uploaded"),
      eq(mediaAssets.purpose, "recipe_cover"),
    ))
    .limit(1);
  return image;
}
