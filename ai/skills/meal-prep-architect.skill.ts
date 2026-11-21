import { dietaryPreferencesSchema } from "@app/modules";
import { z } from "zod";
import { defineSkill } from "./skill.types";

const ingredient = z.object({
  name: z.string().min(1).describe("Ingredient name."),
  quantity: z.number().positive().describe("Ingredient quantity."),
  unit: z.string().min(1).describe("Measurement unit."),
  notes: z.string().optional().describe("Optional preparation note."),
}).strict();

const macros = z.object({
  calories: z.number().nonnegative().describe("Calories per serving."),
  proteinG: z.number().nonnegative().describe("Protein grams per serving."),
  carbsG: z.number().nonnegative().describe("Carbohydrate grams per serving."),
  fatG: z.number().nonnegative().describe("Fat grams per serving."),
  fiberG: z.number().nonnegative().describe("Estimated fiber grams per serving."),
}).strict();

const inputSchema = z.object({
  goal: z.string().min(1).describe("Meal-prep goal."),
  servings: z.number().int().positive().describe("Number of portions to prepare."),
  availableIngredients: z.array(z.string().describe("Available ingredient.")).optional().describe("Known stock."),
  dietaryPreferences: dietaryPreferencesSchema.describe("Allergies, dislikes, and dietary notes."),
  macroTargets: macros.partial().optional().describe("Optional per-serving nutrition targets."),
  currency: z.string().describe("Currency code for cost estimates."),
  freezerFriendlyRequired: z.boolean().optional().describe("Whether the recipe must freeze well."),
  availableTagSlugs: z.array(z.string()).max(100).optional()
    .describe("Existing canonical tag slugs that should be preferred."),
}).strict();

const outputSchema = z.object({
  title: z.string().min(1).describe("Recipe title."),
  description: z.string().min(1).describe("Short recipe summary."),
  prepTimeMin: z.number().int().nonnegative().describe("Preparation time in minutes."),
  cookTimeMin: z.number().int().nonnegative().describe("Cooking time in minutes."),
  servings: z.number().positive().describe("Number of servings."),
  isFreezerFriendly: z.boolean().describe("Whether the meal freezes successfully."),
  ingredients: z.array(ingredient).describe("Scaled ingredient list."),
  instructions: z.array(z.string().min(1).describe("Preparation step.")).min(1).describe("Ordered steps."),
  storageGuidance: z.object({
    fridgeDays: z.number().int().nonnegative().describe("Safe refrigerated storage days."),
    freezerMonths: z.number().nonnegative().describe("Recommended freezer storage months."),
    reheatingTip: z.string().describe("Safe reheating guidance."),
  }).strict().describe("Storage and reheating instructions."),
  estimatedMacrosPerServing: macros.describe("Estimated per-serving nutrition."),
  estimatedCostPerServing: z.number().nonnegative().describe("Estimated cost per serving."),
  tags: z.array(z.object({
    slug: z.string().optional(),
    label: z.string().min(1),
    category: z.enum(["dietary", "nutrition", "prep", "flavor", "custom"]).optional(),
  }).strict()).max(3).describe("At most three attribute chips; prefer availableTagSlugs."),
  shelfLifeDays: z.object({
    fridge: z.number().int().positive().nullable().optional(),
    freezer: z.number().int().positive().nullable().optional(),
    pantry: z.number().int().positive().nullable().optional(),
  }).strict().describe("Realistic storage shelf life; null for unsuitable methods."),
}).strict();

export const mealPrepArchitectSkill = defineSkill({
  name: "MealPrepArchitectSkill",
  inputSchema,
  outputSchema,
  modelTier: "reasoning",
  system: "<role>Design practical batch-cookable recipes.</role><rules>Respect allergies and dislikes. Nutrition including fiber is an estimate, never a measured value. Do not invent precise nutrition or prices when context is insufficient; label estimates conservatively. Scale ingredient quantities to servings. When storage or reheating advice is relevant, include it naturally in the instructions, consistent with storageGuidance. Do not recommend freezing a recipe that is not freezer-friendly.</rules><context>Use only the supplied structured context.</context><output_format>Return only the schema-conforming recipe.</output_format>",
  prompt: (input) => `<context>${JSON.stringify(input)}</context>`,
});

export type MealPrepInput = z.infer<typeof inputSchema>;
export type MealPrepOutput = z.infer<typeof outputSchema>;
