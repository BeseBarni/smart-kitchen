import { getDatabase, inventoryItems, recipes } from "@app/db";
import { and, eq } from "drizzle-orm";
import type { CookRecipeInput } from "./recipes.schema";

export async function cookRecipeRows(
  userId: string,
  recipeId: string,
  batches: CookRecipeInput["batches"],
  preparedAt?: string,
) {
  return getDatabase().transaction(async (tx) => {
    const [recipe] = await tx.select().from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId))).for("update").limit(1);
    if (!recipe) return undefined;
    const preparedDate = preparedAt ? new Date(preparedAt) : new Date();
    return tx.insert(inventoryItems).values(batches.map((batch) => ({
      userId, name: recipe.title, itemType: "meal_prep" as const, recipeId,
      storageLocation: batch.storageLocation, initialQuantity: String(batch.quantity),
      remainingQuantity: String(batch.quantity), unit: batch.unit ?? "portion",
      preparedAt: preparedDate, expiresAt: batch.expiresAt ? new Date(batch.expiresAt) : null,
      imageUrl: recipe.imageUrl, caloriesPerUnit: recipe.caloriesPerServing,
      proteinPerUnit: recipe.proteinPerServing, carbsPerUnit: recipe.carbsPerServing,
      fatPerUnit: recipe.fatPerServing, fiberPerUnit: recipe.fiberPerServing,
      costPerUnit: recipe.costPerServing, currency: recipe.currency,
    }))).returning();
  });
}
