import { and, desc, eq, gte, lt, lte } from "drizzle-orm";
import { getDatabase, inventoryItems, mealLogs } from "@app/db";
import { numberToNumeric } from "../shared/numeric";
import type { CreateMealLogInput, ListMealLogsQuery } from "./meal-logs.schema";

function logValues(input: CreateMealLogInput) {
  return {
    inventoryItemId: input.inventoryItemId,
    recipeId: input.recipeId,
    name: input.name,
    mealType: input.mealType,
    quantity: String(input.quantity),
    unit: input.unit,
    calories: numberToNumeric(input.calories),
    proteinG: numberToNumeric(input.proteinG),
    carbsG: numberToNumeric(input.carbsG),
    fatG: numberToNumeric(input.fatG),
    fiberG: numberToNumeric(input.fiberG ?? null),
    costAmount: numberToNumeric(input.costAmount),
    currency: input.currency,
    eatenAt: new Date(input.eatenAt),
  };
}

export async function listMealLogRows(userId: string, filters: ListMealLogsQuery) {
  const conditions = [eq(mealLogs.userId, userId)];
  if (filters.from) conditions.push(gte(mealLogs.eatenAt, new Date(filters.from)));
  if (filters.to) conditions.push(lt(mealLogs.eatenAt, new Date(filters.to)));
  if (filters.mealType) conditions.push(eq(mealLogs.mealType, filters.mealType));
  return getDatabase()
    .select()
    .from(mealLogs)
    .where(and(...conditions))
    .orderBy(desc(mealLogs.eatenAt), desc(mealLogs.id))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function insertMealLog(userId: string, input: CreateMealLogInput) {
  const [row] = await getDatabase()
    .insert(mealLogs)
    .values({ userId, ...logValues(input) })
    .returning();
  return row;
}

export async function getDailyMealLogRows(
  userId: string,
  date: string,
  bounds?: { from: string; to: string },
) {
  const start = new Date(bounds?.from ?? `${date}T00:00:00.000Z`);
  const end = bounds ? new Date(bounds.to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return getDatabase()
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), gte(mealLogs.eatenAt, start), lt(mealLogs.eatenAt, end)));
}

export async function deleteMealLogRow(
  userId: string,
  id: string,
  restoreInventory: boolean,
  requireInventory: boolean,
): Promise<"deleted" | "not_found" | "missing_inventory"> {
  return getDatabase().transaction(async (tx) => {
    const [log] = await tx
      .select()
      .from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), eq(mealLogs.id, id)))
      .for("update")
      .limit(1);
    if (!log) return "not_found";
    if (requireInventory && !log.inventoryItemId) return "missing_inventory";
    if (restoreInventory && log.inventoryItemId) {
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, log.inventoryItemId)))
        .for("update")
        .limit(1);
      if (!item && requireInventory) return "missing_inventory";
      if (item) {
        await tx
          .update(inventoryItems)
          .set({
            remainingQuantity: String(Number(item.remainingQuantity) + Number(log.quantity)),
            status: "in_stock",
            updatedAt: new Date(),
          })
          .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, item.id)));
      }
    }
    await tx.delete(mealLogs).where(and(eq(mealLogs.userId, userId), eq(mealLogs.id, id)));
    return "deleted";
  });
}
