import { z } from "zod";
import { defineSkill } from "./skill.types";

const inputSchema = z.object({
  recipeTitle: z.string().min(1).describe("Recipe name."),
  servings: z.number().positive().describe("Number of portions."),
  ingredients: z.array(z.object({
    name: z.string().describe("Ingredient name."),
    quantity: z.number().positive().describe("Recipe quantity."),
    unit: z.string().describe("Recipe unit."),
    knownMacros: z.object({
      calories: z.number().nonnegative().optional().describe("Known calories for the quantity."),
      proteinG: z.number().nonnegative().optional().describe("Known protein grams."),
      carbsG: z.number().nonnegative().optional().describe("Known carbohydrate grams."),
      fatG: z.number().nonnegative().optional().describe("Known fat grams."),
      fiberG: z.number().nonnegative().optional().describe("Known fiber grams."),
    }).strict().optional().describe("Known nutrition values."),
    knownPrice: z.number().nonnegative().optional().describe("Known ingredient cost."),
  }).strict().describe("Ingredient and known values.")).min(1).describe("Recipe ingredients."),
  currency: z.string().describe("Currency for the estimate."),
}).strict();

const outputSchema = z.object({
  calories: z.number().nonnegative().describe("Estimated calories per serving."),
  proteinG: z.number().nonnegative().describe("Estimated protein grams per serving."),
  carbsG: z.number().nonnegative().describe("Estimated carbohydrate grams per serving."),
  fatG: z.number().nonnegative().describe("Estimated fat grams per serving."),
  fiberG: z.number().nonnegative().describe("Estimated fiber grams per serving."),
  costPerServing: z.number().nonnegative().describe("Estimated cost per serving."),
  currency: z.string().describe("Currency code used."),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence based on available source values."),
}).strict();

export const nutritionCostEstimatorSkill = defineSkill({
  name: "NutritionCostEstimatorSkill",
  inputSchema,
  outputSchema,
  modelTier: "fast",
  system: "<role>Estimate recipe nutrition and cost per serving.</role><rules>Use supplied known values first, state uncertainty through confidence, and never imply estimates are medical advice. Do not treat unknown values as exact.</rules><context>Use only the provided recipe, ingredient values, and currency.</context><output_format>Return only the schema-conforming estimate.</output_format>",
  prompt: (input) => `<context>${JSON.stringify(input)}</context>`,
});

export type NutritionCostInput = z.infer<typeof inputSchema>;
export type NutritionCostOutput = z.infer<typeof outputSchema>;
