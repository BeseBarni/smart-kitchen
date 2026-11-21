import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDatabase, ingredientTags, recipeTags, tags } from "@app/db";
import type { RawTagInput, TagCategory } from "./tags.schema";

export async function listTags(
  userId: string,
  filters: { search?: string; category?: TagCategory },
) {
  const conditions = [
    or(eq(tags.userId, userId), sql`${tags.userId} is null`),
  ];
  if (filters.category) conditions.push(eq(tags.category, filters.category));
  if (filters.search) {
    conditions.push(or(
      ilike(tags.slug, `%${filters.search}%`),
      ilike(tags.label, `%${filters.search}%`),
    )!);
  }
  return getDatabase()
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(sql`${tags.userId} is null desc`, asc(tags.label));
}

export async function findMatchingTag(
  userId: string,
  slug: string,
  label: string,
) {
  return getDatabase()
    .select()
    .from(tags)
    .where(and(
      or(eq(tags.userId, userId), sql`${tags.userId} is null`),
      or(eq(tags.slug, slug), ilike(tags.label, label)),
    ))
    .orderBy(sql`${tags.userId} is null desc`)
    .limit(1)
    .then((rows) => rows[0]);
}

export async function insertCustomTag(userId: string, input: RawTagInput & { slug: string }) {
  const [row] = await getDatabase()
    .insert(tags)
    .values({
      userId,
      slug: input.slug,
      label: input.label,
      i18nKey: null,
      category: input.category ?? "custom",
      colorToken: "neutral",
    })
    .returning();
  return row;
}

export async function replaceRecipeTags(recipeId: string, tagIds: string[]) {
  return getDatabase().transaction(async (tx) => {
    await tx.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));
    if (tagIds.length > 0) {
      await tx.insert(recipeTags).values(tagIds.slice(0, 3).map((tagId) => ({
        recipeId,
        tagId,
      })));
    }
  });
}

export async function replaceIngredientTags(ingredientId: string, tagIds: string[]) {
  return getDatabase().transaction(async (tx) => {
    await tx.delete(ingredientTags).where(eq(ingredientTags.ingredientId, ingredientId));
    if (tagIds.length > 0) {
      await tx.insert(ingredientTags).values(tagIds.slice(0, 3).map((tagId) => ({
        ingredientId,
        tagId,
      })));
    }
  });
}
