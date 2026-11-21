import { chatJsonValueSchema, estimatedMacrosPerUnitSchema } from "@app/modules";
import { z } from "zod";
import { defineTool, toolOk } from "./tool.types";

const recipeDraft = z.object({
  title: z.string().describe("Recipe title."),
  description: z.string().describe("Short recipe summary."),
  servings: z.number().positive().describe("Number of servings."),
  ingredients: z.array(z.object({
    name: z.string().describe("Ingredient name."),
    quantity: z.number().positive().describe("Ingredient quantity."),
    unit: z.string().describe("Ingredient unit."),
  }).strict().describe("Recipe ingredient.")).describe("Recipe ingredients."),
  instructions: z.array(z.string().describe("Preparation step.")).describe("Ordered steps."),
  caloriesPerServing: z.number().nullable().optional().describe("Calories per serving."),
  proteinPerServing: z.number().nullable().optional().describe("Protein grams per serving."),
  carbsPerServing: z.number().nullable().optional().describe("Carbohydrate grams per serving."),
  fatPerServing: z.number().nullable().optional().describe("Fat grams per serving."),
  fiberPerServing: z.number().nonnegative().describe("Estimated fiber grams per serving."),
  costPerServing: z.number().nullable().optional().describe("Cost per serving."),
  currency: z.string().optional().describe("Currency code."),
}).strict();

export const presentRecipeDraftTool = defineTool({
  name: "ui_present_recipe_draft",
  description: "Present a generated recipe draft for review without saving or changing data.",
  inputSchema: z.object({ recipe: recipeDraft }).strict(),
  outputSchema: recipeDraft,
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async ({ recipe }) => toolOk(recipe),
  toUiDirective: (recipe) => ({
    component: "recipe_preview_card",
    status: "draft",
    recipe,
    canSave: true,
    canCookAndStock: false,
  }),
});

const confirmationInput = z.object({
  actionId: z.string().min(1).describe("Stable identifier for the proposed action."),
  title: z.string().min(1).describe("Short confirmation title."),
  description: z.string().min(1).describe("Explain the exact action and affected items."),
  confirmLabel: z.string().min(1).describe("Label for the confirmation action."),
  payload: z.record(z.string(), chatJsonValueSchema).describe("JSON-safe action details for a future confirmed turn."),
}).strict();

export const requestConfirmationTool = defineTool({
  name: "ui_request_confirmation",
  description: "Ask for explicit confirmation before a consequential or ambiguous action; do not mutate data.",
  inputSchema: confirmationInput,
  modelInputSchema: confirmationInput.extend({
    payload: z.record(z.string(), z.unknown()).describe("JSON-safe action details for a future confirmed turn."),
  }),
  outputSchema: confirmationInput,
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input) => toolOk(input),
  toUiDirective: (input) => ({
    component: "confirmation_prompt",
    ...input,
  }),
});

const recommendationsSchema = z.object({
  recommendations: z.array(z.string().trim().min(1).max(120).describe("A concise follow-up message the user can send."))
    .min(1).max(4).describe("Relevant follow-up messages."),
}).strict();

export const presentRecommendationsTool = defineTool({
  name: "ui_present_recommendations",
  description: "Present one to four relevant optional follow-up messages after your answer. Do not suggest actions that were not performed as completed.",
  inputSchema: recommendationsSchema,
  outputSchema: recommendationsSchema,
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input) => toolOk(input),
  toUiDirective: ({ recommendations }) => ({ component: "recommendation_chips", recommendations }),
});

const receiptImportSchema = z.object({
  merchant: z.string().nullable(),
  purchasedAt: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number().nonnegative().nullable(),
  items: z.array(z.object({
    tempId: z.string(),
    name: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    priceAmount: z.number().nonnegative().nullable(),
    storageLocation: z.enum(["fridge", "freezer", "pantry"]),
    estimatedShelfLifeDays: z.number().positive().nullable(),
    estimatedMacrosPerUnit: estimatedMacrosPerUnitSchema.nullable().optional()
      .describe("Estimated nutrition per quantity unit, if available."),
    isFoodItem: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
  }).strict()).describe("Editable extracted receipt food lines."),
}).strict();

export const presentReceiptImportTool = defineTool({
  name: "ui_present_receipt_import",
  description: "Present extracted receipt data for review without mutating inventory.",
  inputSchema: receiptImportSchema,
  outputSchema: receiptImportSchema,
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input) => toolOk(input),
  toUiDirective: (input) => ({ component: "receipt_import_card", ...input }),
});

export const uiTools = [
  presentRecipeDraftTool,
  requestConfirmationTool,
  presentRecommendationsTool,
  presentReceiptImportTool,
] as const;
