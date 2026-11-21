import { and, asc, desc, eq, ilike, lte } from "drizzle-orm";
import { getDatabase, ingredients, recipeIngredients, recipes } from "@app/db";
import { numberToNumeric } from "../shared/numeric";
import type { CreateRecipeInput, ListRecipesQuery, UpdateRecipeInput } from "./recipes.schema";

type RecipeComputed = {
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
  fiberPerServing: number | null;
  costPerServing: number | null;
};

function insertValues(input: CreateRecipeInput, computed: RecipeComputed) {
  return {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    imageUrl: input.imageUrl,
    prepTimeMin: input.prepTimeMin,
    cookTimeMin: input.cookTimeMin,
    servings: String(input.servings),
    isFreezerFriendly: input.isFreezerFriendly,
    source: input.source,
    caloriesPerServing: numberToNumeric(computed.caloriesPerServing),
    proteinPerServing: numberToNumeric(computed.proteinPerServing),
    carbsPerServing: numberToNumeric(computed.carbsPerServing),
    fatPerServing: numberToNumeric(computed.fatPerServing),
    fiberPerServing: numberToNumeric(computed.fiberPerServing),
    costPerServing: numberToNumeric(computed.costPerServing),
    currency: input.currency,
    shelfLifeDays: input.shelfLifeDays ?? {},
  };
}

function updateValues(
  input: UpdateRecipeInput,
  computed: Partial<RecipeComputed>,
): Partial<typeof recipes.$inferInsert> {
  const values: Partial<typeof recipes.$inferInsert> = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;
  if (input.instructions !== undefined) values.instructions = input.instructions;
  if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
  if (input.prepTimeMin !== undefined) values.prepTimeMin = input.prepTimeMin;
  if (input.cookTimeMin !== undefined) values.cookTimeMin = input.cookTimeMin;
  if (input.servings !== undefined) values.servings = String(input.servings);
  if (input.isFreezerFriendly !== undefined) values.isFreezerFriendly = input.isFreezerFriendly;
  if (input.source !== undefined) values.source = input.source;
  if (input.currency !== undefined) values.currency = input.currency;
  if (input.shelfLifeDays !== undefined) values.shelfLifeDays = input.shelfLifeDays;
  if (computed.caloriesPerServing !== undefined) values.caloriesPerServing = numberToNumeric(computed.caloriesPerServing);
  if (computed.proteinPerServing !== undefined) values.proteinPerServing = numberToNumeric(computed.proteinPerServing);
  if (computed.carbsPerServing !== undefined) values.carbsPerServing = numberToNumeric(computed.carbsPerServing);
  if (computed.fatPerServing !== undefined) values.fatPerServing = numberToNumeric(computed.fatPerServing);
  if (computed.fiberPerServing !== undefined) values.fiberPerServing = numberToNumeric(computed.fiberPerServing);
  if (computed.costPerServing !== undefined) values.costPerServing = numberToNumeric(computed.costPerServing);
  return values;
}

export async function listRecipeRows(userId: string, filters: ListRecipesQuery) {
  const conditions = [eq(recipes.userId, userId)];
  if (filters.search) conditions.push(ilike(recipes.title, `%${filters.search}%`));
  if (filters.source) conditions.push(eq(recipes.source, filters.source));
  if (filters.isFreezerFriendly !== undefined) {
    conditions.push(eq(recipes.isFreezerFriendly, filters.isFreezerFriendly));
  }
  if (filters.maxPrepTimeMin !== undefined) conditions.push(lte(recipes.prepTimeMin, filters.maxPrepTimeMin));
  return getDatabase()
    .select()
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.updatedAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function findRecipe(userId: string, id: string) {
  const [recipe] = await getDatabase()
    .select()
    .from(recipes)
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id)))
    .limit(1);
  if (!recipe) return undefined;
  const lines = await getDatabase()
    .select({ line: recipeIngredients, ingredient: ingredients })
    .from(recipeIngredients)
    .leftJoin(
      ingredients,
      and(eq(recipeIngredients.ingredientId, ingredients.id), eq(ingredients.userId, userId)),
    )
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.sortOrder), asc(recipeIngredients.id));
  return { recipe, lines };
}

export async function insertRecipe(
  userId: string,
  input: CreateRecipeInput,
  computed: RecipeComputed,
) {
  return getDatabase().transaction(async (tx) => {
    const { ingredients: lines, ...fields } = input;
    const [recipe] = await tx
      .insert(recipes)
      .values({ userId, ...insertValues({ ...fields, ingredients: lines }, computed) })
      .returning();
    if (!recipe) return undefined;
    if (lines.length > 0) {
      await tx.insert(recipeIngredients).values(
        lines.map((line) => ({
          ...line,
          recipeId: recipe.id,
          quantity: String(line.quantity),
        })),
      );
    }
    return recipe.id;
  });
}

export async function updateRecipeRows(
  userId: string,
  id: string,
  input: UpdateRecipeInput,
  computed: Partial<RecipeComputed>,
): Promise<boolean> {
  return getDatabase().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.id, id)))
      .for("update")
      .limit(1);
    if (!existing) return false;
    const { ingredients: lines, ...fields } = input;
    await tx
      .update(recipes)
      .set({ ...updateValues({ ...fields, ingredients: lines }, computed), updatedAt: new Date() })
      .where(and(eq(recipes.userId, userId), eq(recipes.id, id)));
    if (lines !== undefined) {
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
      if (lines.length > 0) {
        await tx.insert(recipeIngredients).values(
          lines.map((line) => ({
            ...line,
            recipeId: id,
            quantity: String(line.quantity),
          })),
        );
      }
    }
    return true;
  });
}

export async function deleteRecipeRow(userId: string, id: string): Promise<boolean> {
  const rows = await getDatabase()
    .delete(recipes)
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id)))
    .returning({ id: recipes.id });
  return rows.length > 0;
}
