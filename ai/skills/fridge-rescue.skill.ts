import { dietaryPreferencesSchema } from "@app/modules";
import { z } from "zod";
import { defineSkill } from "./skill.types";

const item = z.object({
  id: z.string().optional().describe("Inventory item ID, if available."),
  name: z.string().describe("Food name."),
  quantity: z.number().nonnegative().describe("Quantity available."),
  unit: z.string().describe("Quantity unit."),
  expiresAt: z.iso.datetime().optional().describe("Expiration timestamp, if known."),
}).strict();

const inputSchema = z.object({
  expiringItems: z.array(item).describe("Items prioritized for use."),
  pantryOrFridgeItems: z.array(item).describe("Other available foods."),
  dietaryPreferences: dietaryPreferencesSchema.describe("Allergies, dislikes, and dietary notes."),
  maxPrepTimeMin: z.number().int().positive().optional().describe("Maximum preparation time."),
}).strict();

const outputSchema = z.object({
  rescueOptions: z.array(z.object({
    title: z.string().min(1).describe("Meal plan title."),
    usesExpiringItems: z.array(z.string().describe("Expiring food used.")).min(1).describe("Expiring items used."),
    missingIngredients: z.array(z.string().describe("Ingredient to obtain.")).describe("Missing foods."),
    prepTimeMin: z.number().int().nonnegative().describe("Preparation time in minutes."),
    quickSteps: z.array(z.string().describe("Concise cooking step.")).min(1).describe("Short method."),
    priorityReason: z.string().min(1).describe("Why this option should be prioritized."),
  }).strict().describe("One rescue meal plan.")).min(1).max(3).describe("Ranked rescue plans."),
}).strict();

export const fridgeRescueSkill = defineSkill({
  name: "FridgeRescueSkill",
  inputSchema,
  outputSchema,
  modelTier: "reasoning",
  system: "<role>Rescue food that is approaching expiry with practical meals.</role><rules>Respect allergies and dislikes. Prioritize the soonest-expiring items. Do not claim a food is safe when the context does not establish that.</rules><context>Use only the supplied structured inventory and preferences.</context><output_format>Return one to three ranked plans matching the schema.</output_format>",
  prompt: (input) => `<context>${JSON.stringify(input)}</context>`,
});

export type FridgeRescueInput = z.infer<typeof inputSchema>;
export type FridgeRescueOutput = z.infer<typeof outputSchema>;
