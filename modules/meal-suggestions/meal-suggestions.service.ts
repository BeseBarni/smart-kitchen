import { err, ok, type AppError, type Result } from "@app/shared";
import { list as listInventory } from "../inventory/inventory.service";
import { getDailySummary } from "../meal-logs/meal-logs.service";
import { getOrCreateProfile } from "../profile/profile.service";
import type { MealSuggestions, SuggestionContext } from "./meal-suggestions.schema";
import type { z } from "zod";
import { mealSuggestionsResponseSchema } from "./meal-suggestions.schema";

export async function buildSuggestionContext(
  userId: string,
  range: { date: string; from: string; to: string },
): Promise<Result<SuggestionContext, AppError>> {
  const [profile, summary] = await Promise.all([
    getOrCreateProfile(userId), getDailySummary(userId, range),
  ]);
  if (!profile.success) return profile;
  if (!summary.success) return summary;
  const stock: SuggestionContext["stock"] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await listInventory(userId, { status: "in_stock", sortBy: "createdAt", limit: 100, offset });
    if (!page.success) return page;
    for (const item of page.data) {
      if (item.remainingQuantity <= 0 || (item.expiresAt !== null && Date.parse(item.expiresAt) <= Date.now())) continue;
      stock.push({
        id: item.id, name: item.name, itemType: item.itemType, storageLocation: item.storageLocation,
        remainingQuantity: item.remainingQuantity, unit: item.unit, caloriesPerUnit: item.caloriesPerUnit,
        proteinPerUnit: item.proteinPerUnit, carbsPerUnit: item.carbsPerUnit, fatPerUnit: item.fatPerUnit,
        fiberPerUnit: item.fiberPerUnit,
      });
    }
    if (stock.length > 500) return err({ code: "VALIDATION_ERROR", message: "Too many stock items for suggestions." });
    if (page.data.length < 100) break;
  }
  return ok({
    date: range.date,
    stock,
    profile: {
      dailyCalorieTarget: profile.data.dailyCalorieTarget, dailyProteinG: profile.data.dailyProteinG,
      dailyCarbsG: profile.data.dailyCarbsG, dailyFatG: profile.data.dailyFatG,
      dailyFiberG: profile.data.dailyFiberG, dietaryPreferences: profile.data.dietaryPreferences,
    },
    consumed: {
      calories: summary.data.calories, proteinG: summary.data.proteinG,
      carbsG: summary.data.carbsG, fatG: summary.data.fatG, fiberG: summary.data.fiberG,
      unknownCaloriesCount: summary.data.unknownCaloriesCount, unknownProteinCount: summary.data.unknownProteinCount,
      unknownCarbsCount: summary.data.unknownCarbsCount, unknownFatCount: summary.data.unknownFatCount,
      unknownFiberCount: summary.data.unknownFiberCount,
    },
  });
}

export function validateSuggestions(
  context: SuggestionContext,
  plan: MealSuggestions,
): Result<z.infer<typeof mealSuggestionsResponseSchema>, AppError> {
  const stock = new Map(context.stock.map((item) => [item.id, item]));
  const used = new Map<string, number>();
  const slots = new Set<string>();
  for (const suggestion of plan.suggestions) {
    if (slots.has(suggestion.mealType)) return err({ code: "VALIDATION_ERROR", message: "Suggestions contain duplicate meal slots." });
    slots.add(suggestion.mealType);
    for (const item of suggestion.items) {
      const available = stock.get(item.inventoryItemId);
      if (!available) return err({ code: "VALIDATION_ERROR", message: "Suggestion references unavailable stock." });
      const quantity = (used.get(item.inventoryItemId) ?? 0) + item.quantity;
      if (quantity > available.remainingQuantity) return err({ code: "VALIDATION_ERROR", message: "Suggestions exceed available stock." });
      used.set(item.inventoryItemId, quantity);
    }
  }
  return ok({
    ...plan,
    suggestions: plan.suggestions.map((suggestion) => ({
      ...suggestion,
      items: suggestion.items.map((item) => {
        const available = stock.get(item.inventoryItemId);
        if (!available) throw new Error("Validated suggestion stock disappeared.");
        return { ...item, name: available.name, unit: available.unit };
      }),
    })),
  });
}
