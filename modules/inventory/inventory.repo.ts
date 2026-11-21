import { and, asc, desc, eq, ilike, inArray, lte, sql } from "drizzle-orm";
import {
  getDatabase,
  inventoryItems,
  inventoryItemTags,
  recipeIngredients,
  recipes,
  tags,
} from "@app/db";
import { numberToNumeric } from "../shared/numeric";
import type {
  BatchCreateInventoryInput,
  BatchInventoryItemInput,
  CreateInventoryItemInput,
  ListInventoryQuery,
  UpdateInventoryItemInput,
} from "./inventory.schema";

function insertValues(input: CreateInventoryItemInput) {
  return {
    name: input.name,
    itemType: input.itemType,
    recipeId: input.recipeId,
    ingredientId: input.ingredientId,
    storageLocation: input.storageLocation,
    status: input.status,
    initialQuantity: String(input.initialQuantity),
    remainingQuantity: String(input.remainingQuantity),
    unit: input.unit,
    preparedAt: input.preparedAt ? new Date(input.preparedAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    imageUrl: input.imageUrl,
    caloriesPerUnit: numberToNumeric(input.caloriesPerUnit),
    proteinPerUnit: numberToNumeric(input.proteinPerUnit),
    carbsPerUnit: numberToNumeric(input.carbsPerUnit),
    fatPerUnit: numberToNumeric(input.fatPerUnit),
    fiberPerUnit: numberToNumeric(input.fiberPerUnit ?? null),
    costPerUnit: numberToNumeric(input.costPerUnit),
    currency: input.currency,
    shelfLifeDays: input.shelfLifeDays ?? {},
  };
}

function updateValues(input: UpdateInventoryItemInput): Partial<typeof inventoryItems.$inferInsert> {
  const values: Partial<typeof inventoryItems.$inferInsert> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.itemType !== undefined) values.itemType = input.itemType;
  if (input.recipeId !== undefined) values.recipeId = input.recipeId;
  if (input.ingredientId !== undefined) values.ingredientId = input.ingredientId;
  if (input.storageLocation !== undefined) values.storageLocation = input.storageLocation;
  if (input.status !== undefined) values.status = input.status;
  if (input.initialQuantity !== undefined) values.initialQuantity = String(input.initialQuantity);
  if (input.remainingQuantity !== undefined) values.remainingQuantity = String(input.remainingQuantity);
  if (input.unit !== undefined) values.unit = input.unit;
  if (input.preparedAt !== undefined) values.preparedAt = input.preparedAt ? new Date(input.preparedAt) : null;
  if (input.expiresAt !== undefined) values.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
  if (input.caloriesPerUnit !== undefined) values.caloriesPerUnit = numberToNumeric(input.caloriesPerUnit);
  if (input.proteinPerUnit !== undefined) values.proteinPerUnit = numberToNumeric(input.proteinPerUnit);
  if (input.carbsPerUnit !== undefined) values.carbsPerUnit = numberToNumeric(input.carbsPerUnit);
  if (input.fatPerUnit !== undefined) values.fatPerUnit = numberToNumeric(input.fatPerUnit);
  if (input.fiberPerUnit !== undefined) values.fiberPerUnit = numberToNumeric(input.fiberPerUnit);
  if (input.costPerUnit !== undefined) values.costPerUnit = numberToNumeric(input.costPerUnit);
  if (input.currency !== undefined) values.currency = input.currency;
  if (input.shelfLifeDays !== undefined) values.shelfLifeDays = input.shelfLifeDays;
  return values;
}

export async function listInventoryRows(userId: string, filters: ListInventoryQuery) {
  const conditions = [
    eq(inventoryItems.userId, userId),
    eq(inventoryItems.status, filters.status),
  ];
  if (filters.storageLocation) conditions.push(eq(inventoryItems.storageLocation, filters.storageLocation));
  if (filters.itemType) conditions.push(eq(inventoryItems.itemType, filters.itemType));
  if (filters.search) conditions.push(ilike(inventoryItems.name, `%${filters.search}%`));
  const order = filters.sortBy === "name"
    ? asc(inventoryItems.name)
    : filters.sortBy === "createdAt"
      ? desc(inventoryItems.createdAt)
      : asc(inventoryItems.expiresAt);
  return getDatabase()
    .select()
    .from(inventoryItems)
    .where(and(...conditions))
    .orderBy(order, desc(inventoryItems.id))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function findInventoryItem(userId: string, id: string) {
  const [row] = await getDatabase()
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
    .limit(1);
  return row;
}

export async function findInventoryTags(itemIds: string[]) {
  if (itemIds.length === 0) return [];
  return getDatabase()
    .select({
      inventoryItemId: inventoryItemTags.inventoryItemId,
      id: tags.id,
      slug: tags.slug,
      label: tags.label,
      i18nKey: tags.i18nKey,
      category: tags.category,
      colorToken: tags.colorToken,
    })
    .from(inventoryItemTags)
    .innerJoin(tags, eq(inventoryItemTags.tagId, tags.id))
    .where(inArray(inventoryItemTags.inventoryItemId, itemIds));
}

export async function findLinkedRecipe(userId: string, recipeId: string | null) {
  if (!recipeId) return null;
  const [recipe] = await getDatabase()
    .select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      prepTimeMin: recipes.prepTimeMin,
      cookTimeMin: recipes.cookTimeMin,
      servings: recipes.servings,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), eq(recipes.id, recipeId)))
    .limit(1);
  if (!recipe) return null;
  const lines = await getDatabase()
    .select({
      displayName: recipeIngredients.displayName,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      notes: recipeIngredients.notes,
      ingredientId: recipeIngredients.ingredientId,
      sortOrder: recipeIngredients.sortOrder,
    })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder), asc(recipeIngredients.id));
  return {
    ...recipe,
    servings: Number(recipe.servings),
    ingredients: lines.map((line) => ({
      ...line,
      quantity: Number(line.quantity),
    })),
  };
}

export async function insertInventoryItem(userId: string, input: CreateInventoryItemInput) {
  const [row] = await getDatabase()
    .insert(inventoryItems)
    .values({ userId, ...insertValues(input) })
    .returning();
  return row;
}

export async function replaceInventoryItemTags(itemId: string, tagIds: string[]) {
  return getDatabase().transaction(async (tx) => {
    await tx.delete(inventoryItemTags).where(eq(inventoryItemTags.inventoryItemId, itemId));
    if (tagIds.length > 0) {
      await tx.insert(inventoryItemTags).values(tagIds.slice(0, 3).map((tagId) => ({
        inventoryItemId: itemId,
        tagId,
      })));
    }
  });
}

export async function updateStorageLocationRow(
  userId: string,
  id: string,
  storageLocation: "fridge" | "freezer" | "pantry",
  expiresAt: Date | null,
) {
  const [row] = await getDatabase()
    .update(inventoryItems)
    .set({ storageLocation, expiresAt, updatedAt: new Date() })
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
    .returning();
  return row;
}

export function batchInventoryValues(userId: string, item: BatchInventoryItemInput): typeof inventoryItems.$inferInsert {
  return {
    userId,
    name: item.name,
    itemType: "ingredient",
    recipeId: null,
    ingredientId: null,
    storageLocation: item.storageLocation,
    status: "in_stock",
    initialQuantity: String(item.quantity),
    remainingQuantity: String(item.quantity),
    unit: item.unit,
    preparedAt: null,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
    imageUrl: null,
    caloriesPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.calories ?? null),
    proteinPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.proteinG ?? null),
    carbsPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.carbsG ?? null),
    fatPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.fatG ?? null),
    fiberPerUnit: numberToNumeric(item.estimatedMacrosPerUnit?.fiberG ?? null),
    costPerUnit: numberToNumeric(item.costPerUnit ?? null),
    currency: item.currency ?? "HUF",
    shelfLifeDays: item.shelfLifeDays ?? {},
  };
}

export async function insertInventoryBatch(userId: string, input: BatchCreateInventoryInput) {
  return getDatabase().transaction(async (tx) => {
    const rows = [];
    for (const item of input.items) {
      const [row] = await tx
        .insert(inventoryItems)
        .values(batchInventoryValues(userId, item))
        .returning();
      if (!row) throw new Error("Inventory batch insert returned no row.");
      rows.push(row);
    }
    return rows;
  });
}

export async function updateInventoryItemRow(
  userId: string,
  id: string,
  input: UpdateInventoryItemInput,
) {
  const [row] = await getDatabase()
    .update(inventoryItems)
    .set({ ...updateValues(input), updatedAt: new Date() })
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
    .returning();
  return row;
}

export async function deleteInventoryItemRow(userId: string, id: string): Promise<boolean> {
  const rows = await getDatabase()
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
    .returning({ id: inventoryItems.id });
  return rows.length > 0;
}

export async function findExpiringRows(userId: string, withinHours: number) {
  const deadline = new Date(Date.now() + withinHours * 60 * 60 * 1000);
  return getDatabase()
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.userId, userId),
        eq(inventoryItems.status, "in_stock"),
        lte(inventoryItems.expiresAt, deadline),
        sql`${inventoryItems.expiresAt} is not null`,
      ),
    )
    .orderBy(asc(inventoryItems.expiresAt));
}

export async function getInventoryRows(userId: string) {
  return getDatabase()
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.status, "in_stock")));
}

export async function adjustInventoryRow(userId: string, id: string, delta: number) {
  return getDatabase().transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
      .for("update")
      .limit(1);
    if (!item) return { kind: "not_found" as const };
    const remaining = Number(item.remainingQuantity) + delta;
    if (remaining < 0) return { kind: "insufficient" as const };
    const [updated] = await tx
      .update(inventoryItems)
      .set({
        remainingQuantity: String(remaining),
        status: remaining === 0 ? "consumed" : "in_stock",
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
      .returning();
    return updated ? { kind: "updated" as const, item: updated } : { kind: "not_found" as const };
  });
}

export async function discardInventoryRow(userId: string, id: string) {
  const [row] = await getDatabase()
    .update(inventoryItems)
    .set({ status: "discarded", updatedAt: new Date() })
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id)))
    .returning();
  return row;
}
