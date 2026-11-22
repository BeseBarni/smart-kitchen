import { z } from "zod";
import { estimatedMacrosPerUnitSchema, nutritionTargetChangesSchema, rawTagSchema, shelfLifeDaysSchema, stockImageKindSchema } from "@app/modules/schemas";
import type { AgentStreamEvent } from "./stream.types";

const agentNameSchema = z.enum(["orchestrator", "inventory_ops", "recipe_architect", "kitchen_advisor", "vision_extractor"]);
const appDomainSchema = z.enum(["inventory", "recipes", "ingredients", "meal-logs", "profile"]);
const inventoryActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  location: z.enum(["fridge", "freezer", "pantry"]),
});
const recipePayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().min(1).nullable().optional(),
  stockImageKind: stockImageKindSchema.nullable().optional(),
  stockImageName: z.string().min(1).max(255).nullable().optional(),
  prepTimeMin: z.number().nullable().optional(),
  cookTimeMin: z.number().nullable().optional(),
  isFreezerFriendly: z.boolean().optional(),
  servings: z.number(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.number(), unit: z.string(), notes: z.string().nullable().optional() })),
  instructions: z.array(z.string()),
  caloriesPerServing: z.number().nullable().optional(),
  proteinPerServing: z.number().nullable().optional(),
  carbsPerServing: z.number().nullable().optional(),
  fatPerServing: z.number().nullable().optional(),
  fiberPerServing: z.number().nullable().optional(),
  costPerServing: z.number().nullable().optional(),
  currency: z.string().optional(),
  tags: z.array(rawTagSchema).max(3).optional(),
  shelfLifeDays: shelfLifeDaysSchema.optional(),
});
export const uiDirectiveSchema = z.discriminatedUnion("component", [
  z.object({ component: z.literal("profile_targets_updated") }),
  z.object({ component: z.literal("profile_targets_confirmation"), targets: nutritionTargetChangesSchema }),
  z.object({
    component: z.literal("recommendation_chips"),
    recommendations: z.array(z.string().trim().min(1).max(120)).min(1).max(4),
  }),
  z.object({
    component: z.literal("inventory_action_card"),
    action: z.enum(["added", "updated", "consumed", "discarded"]),
    items: z.array(inventoryActionSchema),
  }),
  z.object({
    component: z.literal("recipe_preview_card"),
    status: z.enum(["draft", "saved"]),
    recipe: recipePayloadSchema,
    canSave: z.boolean(),
    canCookAndStock: z.boolean(),
  }),
  z.object({
    component: z.literal("expiring_rescue_card"),
    expiringItems: z.array(z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      expiresAt: z.string().nullable(),
    })),
    rescueOptions: z.array(z.object({
      title: z.string(),
      usesExpiringItems: z.array(z.string()),
      prepTimeMin: z.number(),
    })),
  }),
  z.object({
    component: z.literal("consumption_summary_card"),
    loggedMeal: z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      calories: z.number().nullable(),
      proteinG: z.number().nullable(),
      carbsG: z.number().nullable(),
      fatG: z.number().nullable(),
      fiberG: z.number().nullable().optional(),
      costAmount: z.number().nullable(),
      currency: z.string(),
    }),
    dailyTotals: z.object({
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
    }).optional(),
  }),
  z.object({
    component: z.literal("confirmation_prompt"),
    actionId: z.string(),
    title: z.string(),
    description: z.string(),
    confirmLabel: z.string(),
    payload: z.record(z.string(), z.unknown()),
  }),
  z.object({
    component: z.literal("receipt_import_card"),
    merchant: z.string().nullable(),
    purchasedAt: z.string().nullable(),
    currency: z.string(),
    totalAmount: z.number().nullable(),
    items: z.array(z.object({
      tempId: z.string(),
      name: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      priceAmount: z.number().nonnegative().nullable(),
      storageLocation: z.enum(["fridge", "freezer", "pantry"]),
      estimatedShelfLifeDays: z.number().positive().nullable(),
      expiresAt: z.iso.datetime().nullable().optional(),
      shelfLifeDays: shelfLifeDaysSchema.optional(),
      estimatedMacrosPerUnit: estimatedMacrosPerUnitSchema.nullable().optional(),
      isFoodItem: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
    })),
  }),
]);

export const agentStreamEventSchema: z.ZodType<AgentStreamEvent> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("turn_started"), conversationId: z.string(), turnId: z.string() }),
  z.object({ type: z.literal("conversation_title_updated"), conversationId: z.string() }),
  z.object({
    type: z.literal("agent_status"),
    agent: agentNameSchema,
    status: z.enum(["thinking", "delegating", "running_tool", "running_skill", "analyzing_image"]),
    label: z.string(),
    source: z.literal("ai").optional(),
  }),
  z.object({ type: z.literal("text_delta"), delta: z.string() }),
  z.object({
    type: z.literal("tool_call_started"),
    callId: z.string(),
    agent: agentNameSchema,
    toolName: z.string(),
    argsSummary: z.string(),
  }),
  z.object({
    type: z.literal("tool_call_completed"),
    callId: z.string(),
    agent: agentNameSchema,
    toolName: z.string(),
    success: z.boolean(),
    summary: z.string(),
  }),
  z.object({ type: z.literal("skill_completed"), skillName: z.string(), latencyMs: z.number() }),
  z.object({
    type: z.literal("ui_directive"),
    callId: z.string().optional(),
    directive: uiDirectiveSchema,
    invalidateDomains: z.array(appDomainSchema),
  }),
  z.object({
    type: z.literal("turn_completed"),
    conversationId: z.string(),
    usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
    latencyMs: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    code: z.enum(["ITEM_NOT_FOUND", "INSUFFICIENT_QUANTITY", "VALIDATION_ERROR", "UNAUTHORIZED", "CONFLICT", "INTERNAL_ERROR", "ACCOUNT_NOT_FOUND"]),
    message: z.string(),
    recoverable: z.boolean(),
  }),
]);
