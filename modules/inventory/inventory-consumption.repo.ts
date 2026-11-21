import { getDatabase, inventoryItems, mealLogs } from "@app/db";
import { and, eq } from "drizzle-orm";
import type { ConsumeInventoryInput } from "./inventory.schema";

function multiply(value: string | null, quantity: number): string | null {
  return value === null ? null : String(Number(value) * quantity);
}

export async function consumeInventoryRow(userId: string, id: string, input: ConsumeInventoryInput) {
  return getDatabase().transaction(async (tx) => {
    const [item] = await tx.select().from(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id))).for("update").limit(1);
    if (!item) return { kind: "not_found" as const };
    const remaining = Number(item.remainingQuantity);
    if (item.status !== "in_stock" || remaining < input.quantity) return { kind: "insufficient" as const };
    if (input.requireFiber && input.fiberG === undefined && item.fiberPerUnit === null) {
      return { kind: "missing_fiber" as const };
    }
    const [updatedItem] = await tx.update(inventoryItems).set({
      remainingQuantity: String(remaining - input.quantity),
      status: remaining - input.quantity === 0 ? "consumed" : "in_stock",
      updatedAt: new Date(),
    }).where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.id, id))).returning();
    if (!updatedItem) return { kind: "not_found" as const };
    const [mealLog] = await tx.insert(mealLogs).values({
      userId, inventoryItemId: id, recipeId: item.recipeId, name: item.name, mealType: input.mealType,
      quantity: String(input.quantity), unit: item.unit,
      calories: multiply(item.caloriesPerUnit, input.quantity),
      proteinG: multiply(item.proteinPerUnit, input.quantity),
      carbsG: multiply(item.carbsPerUnit, input.quantity),
      fatG: multiply(item.fatPerUnit, input.quantity),
      fiberG: input.fiberG === undefined ? multiply(item.fiberPerUnit, input.quantity) : String(input.fiberG),
      costAmount: multiply(item.costPerUnit, input.quantity), currency: item.currency,
      eatenAt: input.eatenAt ? new Date(input.eatenAt) : new Date(),
    }).returning();
    if (!mealLog) throw new Error("Meal log insert returned no row.");
    return { kind: "consumed" as const, item: updatedItem, mealLog };
  });
}
