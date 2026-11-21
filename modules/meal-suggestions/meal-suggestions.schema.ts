import { z } from "zod";
import { dailySummaryQuerySchema } from "../meal-logs/meal-logs.schema";
import { inventoryItemSchema } from "../inventory/inventory.schema";
import { profileSchema } from "../profile/profile.schema";

export const mealSuggestionsRequestSchema = dailySummaryQuerySchema.safeExtend({
  locale: z.enum(["en", "hu", "es"]).default("en").describe("Selected application language for generated suggestions."),
}).refine(
  (value) => value.from !== undefined && value.to !== undefined,
  { message: "Local-day bounds are required." },
);

export const suggestionItemSchema = z.object({
  inventoryItemId: z.string().uuid().describe("ID of a provided stock item."),
  quantity: z.number().positive().describe("Quantity of the stock item."),
}).strict();

export const mealSuggestionSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Suggested meal slot."),
  title: z.string().min(1).max(120).describe("Short meal name."),
  explanation: z.string().min(1).max(500).describe("Preparation and limitations."),
  items: z.array(suggestionItemSchema).min(1).max(10).describe("Stock used by this suggestion."),
  estimatedFiberG: z.number().nonnegative().describe("Estimated fiber in grams."),
}).strict();

export const mealSuggestionsSchema = z.object({
  suggestions: z.array(mealSuggestionSchema).max(4).describe("Advisory suggestions for the day."),
  note: z.string().max(500).describe("Missing information, safety, and estimate caveats."),
}).strict();
export const mealSuggestionsResponseSchema = mealSuggestionsSchema.extend({
  noStock: z.boolean().optional().describe("Whether the user needs to add inventory before receiving suggestions."),
  suggestions: z.array(mealSuggestionSchema.extend({
    items: z.array(suggestionItemSchema.extend({
      name: z.string().min(1),
      unit: z.string().min(1),
    })).min(1).max(10),
  })).max(4),
});

export const suggestionContextSchema = z.object({
  date: z.iso.date(),
  stock: z.array(inventoryItemSchema.pick({
    id: true, name: true, itemType: true, storageLocation: true, remainingQuantity: true, unit: true,
    caloriesPerUnit: true, proteinPerUnit: true, carbsPerUnit: true, fatPerUnit: true, fiberPerUnit: true,
  })).max(500),
  profile: profileSchema.pick({
    dailyCalorieTarget: true, dailyProteinG: true, dailyCarbsG: true, dailyFatG: true, dailyFiberG: true,
    dietaryPreferences: true,
  }),
  consumed: z.object({
    calories: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number(), fiberG: z.number(),
    unknownCaloriesCount: z.number().int().nonnegative(), unknownProteinCount: z.number().int().nonnegative(),
    unknownCarbsCount: z.number().int().nonnegative(), unknownFatCount: z.number().int().nonnegative(),
    unknownFiberCount: z.number().int().nonnegative(),
  }),
}).strict();

export type SuggestionContext = z.infer<typeof suggestionContextSchema>;
export type MealSuggestions = z.infer<typeof mealSuggestionsSchema>;
