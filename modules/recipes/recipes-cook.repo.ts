import { getDatabase, inventoryItems, inventoryItemTags, recipeTags, recipes } from "@app/db";
import { and, eq } from "drizzle-orm";
import { estimatedExpiry } from "@app/shared";
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
    const rows = await tx.insert(inventoryItems).values(batches.map((batch) => ({
      userId, name: recipe.title, itemType: "meal_prep" as const, recipeId,
      storageLocation: batch.storageLocation, initialQuantity: String(batch.quantity),
      remainingQuantity: String(batch.quantity), unit: batch.unit ?? "portion",
      preparedAt: preparedDate, expiresAt: batch.expiresAt
        ? new Date(batch.expiresAt)
        : estimatedExpiry(recipe.shelfLifeDays ?? undefined, batch.storageLocation, preparedDate),
      imageUrl: recipe.imageUrl,
      imageAssetId: recipe.imageAssetId,
      stockImageKind: recipe.stockImageKind,
      stockImageName: recipe.stockImageName,
      caloriesPerUnit: recipe.caloriesPerServing,
      proteinPerUnit: recipe.proteinPerServing, carbsPerUnit: recipe.carbsPerServing,
      fatPerUnit: recipe.fatPerServing, fiberPerUnit: recipe.fiberPerServing,
      costPerUnit: recipe.costPerServing, currency: recipe.currency,
      shelfLifeDays: recipe.shelfLifeDays ?? {},
    }))).returning();
    const copiedTags = await tx.select({ tagId: recipeTags.tagId })
      .from(recipeTags)
      .where(eq(recipeTags.recipeId, recipeId));
    if (copiedTags.length > 0) {
      await tx.insert(inventoryItemTags).values(
        rows.flatMap((row) => copiedTags.slice(0, 3).map(({ tagId }) => ({
          inventoryItemId: row.id,
          tagId,
        }))),
      );
    }
    return rows;
  });
}
