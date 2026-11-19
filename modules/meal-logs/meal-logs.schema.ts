import { z } from "zod";

export const mealLogSchema = z
  .object({
    id: z.string().uuid().describe("Meal log identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    inventoryItemId: z.string().uuid().nullable().describe("Consumed inventory item, if linked."),
    recipeId: z.string().uuid().nullable().describe("Recipe eaten, if linked."),
    name: z.string().min(1).describe("Name of the food eaten."),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable().describe("Meal category."),
    quantity: z.number().positive().describe("Amount consumed."),
    unit: z.string().min(1).describe("Unit for the consumed quantity."),
    calories: z.number().nonnegative().nullable().describe("Calories consumed, if known."),
    proteinG: z.number().nonnegative().nullable().describe("Protein grams consumed, if known."),
    carbsG: z.number().nonnegative().nullable().describe("Carbohydrate grams consumed, if known."),
    fatG: z.number().nonnegative().nullable().describe("Fat grams consumed, if known."),
    costAmount: z.number().nonnegative().nullable().describe("Cost of the consumed amount, if known."),
    currency: z.string().describe("ISO currency code used for cost."),
    eatenAt: z.iso.datetime().describe("Time the food was eaten in ISO-8601 format."),
    createdAt: z.iso.datetime().describe("Log creation time in ISO-8601 format."),
  })
  .describe("A meal consumption record with nutrition snapshots.");

export const createMealLogSchema = mealLogSchema
  .omit({ id: true, userId: true, createdAt: true })
  .describe("Input for recording a meal.");

export const listMealLogsQuerySchema = z
  .object({
    from: z.iso.datetime().optional().describe("Inclusive start timestamp."),
    to: z.iso.datetime().optional().describe("Exclusive end timestamp."),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Meal filter."),
    limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum results."),
    offset: z.coerce.number().int().nonnegative().default(0).describe("Results to skip."),
  })
  .describe("Meal log listing filters.");

export const dailySummaryQuerySchema = z
  .object({ date: z.iso.date().describe("Calendar date in YYYY-MM-DD format.") })
  .describe("Date for a daily nutrition summary.");

export const deleteMealLogQuerySchema = z
  .object({
    restoreInventory: z.enum(["true", "false"]).default("false").transform((value) => value === "true")
      .describe("Restore linked inventory quantity."),
  })
  .describe("Meal log deletion options.");

export const dailyMealSummarySchema = z
  .object({
    date: z.iso.date().describe("Summary date."),
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
    costAmount: z.number().nonnegative(),
    mealCount: z.number().int().nonnegative(),
  })
  .describe("Daily nutrition and meal count aggregate.");

export const mealLogIdSchema = z.string().uuid().describe("Meal log identifier.");
export const deleteMealLogInputSchema = z
  .object({ restoreInventory: z.boolean().default(false).describe("Restore linked inventory quantity.") })
  .describe("Meal log deletion options.");

export type MealLogDto = z.infer<typeof mealLogSchema>;
export type CreateMealLogInput = z.infer<typeof createMealLogSchema>;
export type ListMealLogsQuery = z.infer<typeof listMealLogsQuerySchema>;
