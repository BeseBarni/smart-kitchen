import { z } from "zod";

export const dietaryPreferencesSchema = z
  .object({
    allergies: z.array(z.string().describe("An allergen to avoid.")).describe("Known allergies."),
    dislikes: z.array(z.string().describe("A disliked food.")).describe("Foods the user dislikes."),
    goals: z.string().optional().describe("Optional dietary or nutrition goals."),
    notes: z.string().optional().describe("Optional dietary notes."),
  })
  .describe("Dietary preferences for a user.");

export const profileSchema = z
  .object({
    userId: z.string().describe("The external authentication identity ID."),
    dailyCalorieTarget: z.number().int().nullable().describe("Daily calorie target, if configured."),
    dailyProteinG: z.number().int().nullable().describe("Daily protein target in grams."),
    dailyCarbsG: z.number().int().nullable().describe("Daily carbohydrate target in grams."),
    dailyFatG: z.number().int().nullable().describe("Daily fat target in grams."),
    dailyFiberG: z.number().int().nullable().describe("Daily fiber target in grams."),
    dietaryPreferences: dietaryPreferencesSchema.nullable().describe("Dietary preferences, if set."),
    currency: z.string().describe("ISO currency code used for prices."),
    unitSystem: z.enum(["metric", "imperial"]).describe("Preferred measurement system."),
    createdAt: z.iso.datetime().describe("Profile creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Profile update time in ISO-8601 format."),
  })
  .describe("A user's meal-preparation profile.");

export const updateProfileSchema = profileSchema
  .omit({ userId: true, createdAt: true, updatedAt: true })
  .partial()
  .describe("Fields that can be changed in a user's profile.");

const nutritionTarget = z.number().int().positive().nullable();
export const nutritionTargetChangesSchema = z.object({
  dailyCalorieTarget: nutritionTarget.optional().describe("Daily calorie target, or null to unset."),
  dailyProteinG: nutritionTarget.optional().describe("Daily protein grams, or null to unset."),
  dailyCarbsG: nutritionTarget.optional().describe("Daily carbohydrate grams, or null to unset."),
  dailyFatG: nutritionTarget.optional().describe("Daily fat grams, or null to unset."),
  dailyFiberG: nutritionTarget.optional().describe("Daily fiber grams, or null to unset."),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), "At least one target is required.");

export const getOrCreateProfileInputSchema = z
  .object({})
  .describe("Input for retrieving or creating the current user's profile.");

export type DietaryPreferencesDto = z.infer<typeof dietaryPreferencesSchema>;
export type ProfileDto = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type NutritionTargetChanges = z.infer<typeof nutritionTargetChangesSchema>;
