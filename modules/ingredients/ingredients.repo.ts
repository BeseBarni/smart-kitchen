import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { getDatabase, ingredients } from "@app/db";
import { numberToNumeric } from "../shared/numeric";
import type {
  CreateIngredientInput,
  ListIngredientsQuery,
  UpdateIngredientInput,
} from "./ingredients.schema";

function insertValues(input: CreateIngredientInput) {
  return {
    name: input.name,
    brand: input.brand,
    category: input.category,
    imageUrl: input.imageUrl,
    defaultUnit: input.defaultUnit,
    baseQuantity: String(input.baseQuantity),
    calories: numberToNumeric(input.calories ?? null),
    proteinG: numberToNumeric(input.proteinG ?? null),
    carbsG: numberToNumeric(input.carbsG ?? null),
    fatG: numberToNumeric(input.fatG ?? null),
    fiberG: numberToNumeric(input.fiberG ?? null),
    priceAmount: numberToNumeric(input.priceAmount ?? null),
    priceQuantity: numberToNumeric(input.priceQuantity ?? null),
    priceUnit: input.priceUnit,
    currency: input.currency,
    shelfLifeDays: input.shelfLifeDays ?? {},
  };
}

function updateValues(input: UpdateIngredientInput): Partial<typeof ingredients.$inferInsert> {
  const values: Partial<typeof ingredients.$inferInsert> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.brand !== undefined) values.brand = input.brand;
  if (input.category !== undefined) values.category = input.category;
  if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
  if (input.defaultUnit !== undefined) values.defaultUnit = input.defaultUnit;
  if (input.baseQuantity !== undefined) values.baseQuantity = String(input.baseQuantity);
  if (input.calories !== undefined) values.calories = numberToNumeric(input.calories);
  if (input.proteinG !== undefined) values.proteinG = numberToNumeric(input.proteinG);
  if (input.carbsG !== undefined) values.carbsG = numberToNumeric(input.carbsG);
  if (input.fatG !== undefined) values.fatG = numberToNumeric(input.fatG);
  if (input.fiberG !== undefined) values.fiberG = numberToNumeric(input.fiberG);
  if (input.priceAmount !== undefined) values.priceAmount = numberToNumeric(input.priceAmount);
  if (input.priceQuantity !== undefined) values.priceQuantity = numberToNumeric(input.priceQuantity);
  if (input.priceUnit !== undefined) values.priceUnit = input.priceUnit;
  if (input.currency !== undefined) values.currency = input.currency;
  if (input.shelfLifeDays !== undefined) values.shelfLifeDays = input.shelfLifeDays;
  return values;
}

export async function listIngredientRows(userId: string, filters: ListIngredientsQuery) {
  const conditions = [eq(ingredients.userId, userId)];
  if (filters.category) conditions.push(eq(ingredients.category, filters.category));
  if (filters.search) conditions.push(ilike(ingredients.name, `%${filters.search}%`));
  return getDatabase()
    .select()
    .from(ingredients)
    .where(and(...conditions))
    .orderBy(asc(ingredients.name))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function findIngredient(userId: string, id: string) {
  const [row] = await getDatabase()
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.userId, userId), eq(ingredients.id, id)))
    .limit(1);
  return row;
}

export async function findIngredientsByIds(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return getDatabase()
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.userId, userId), inArray(ingredients.id, ids)));
}

export async function findIngredientsByName(userId: string, query: string) {
  return getDatabase()
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.userId, userId), ilike(ingredients.name, `%${query}%`)))
    .orderBy(asc(ingredients.name))
    .limit(50);
}

export async function insertIngredient(userId: string, input: CreateIngredientInput) {
  const [row] = await getDatabase()
    .insert(ingredients)
    .values({ userId, ...insertValues(input) })
    .returning();
  return row;
}

export async function updateIngredientRow(
  userId: string,
  id: string,
  input: UpdateIngredientInput,
) {
  const [row] = await getDatabase()
    .update(ingredients)
    .set({ ...updateValues(input), updatedAt: new Date() })
    .where(and(eq(ingredients.userId, userId), eq(ingredients.id, id)))
    .returning();
  return row;
}

export async function deleteIngredientRow(userId: string, id: string): Promise<boolean> {
  const rows = await getDatabase()
    .delete(ingredients)
    .where(and(eq(ingredients.userId, userId), eq(ingredients.id, id)))
    .returning({ id: ingredients.id });
  return rows.length > 0;
}
