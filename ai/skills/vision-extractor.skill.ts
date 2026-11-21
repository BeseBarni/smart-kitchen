import { z } from "zod";
import { err, ok, type AppError, type Result } from "@app/shared";
import { generateStructuredMultimodal } from "../core/llm.client";
import type { SkillRun } from "./skill.types";
import { estimatedMacrosPerUnitSchema, type ConversationStreamInput } from "@app/modules/schemas";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const suggestedTagSchema = z.object({
  slug: z.string().optional(),
  label: z.string().min(1),
  category: z.enum(["dietary", "nutrition", "prep", "flavor", "custom"]).optional(),
}).strict();
const shelfLifeSchema = z.object({
  fridge: z.number().int().positive().nullable().optional(),
  freezer: z.number().int().positive().nullable().optional(),
  pantry: z.number().int().positive().nullable().optional(),
}).strict();

export const visionExtractorInputSchema = z
  .object({
    images: z.array(z.object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
      base64Data: z.string().min(1),
    }).strict()).min(1).max(3),
    userCaption: z.string().trim().max(4000).optional(),
    userLocale: z.enum(["en", "hu", "es"]),
    defaultCurrency: z.string().trim().min(1).max(8),
  })
  .strict();

export const visionExtractorOutputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("receipt"),
    merchant: z.string().nullable(),
    purchasedAt: z.string().nullable(),
    currency: z.string(),
    totalAmount: z.number().nullable(),
    lineItems: z.array(z.object({
      rawText: z.string(),
      normalizedName: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      totalPrice: z.number().nonnegative().nullable(),
      unitPrice: z.number().nonnegative().nullable(),
      suggestedStorageLocation: z.enum(["fridge", "freezer", "pantry"]),
      estimatedShelfLifeDays: z.number().positive().nullable(),
      estimatedMacrosPerUnit: estimatedMacrosPerUnitSchema.nullable()
        .describe("Estimated nutrition for exactly one of the line item's quantity units, or null if not reasonably estimable."),
      isFoodItem: z.boolean(),
      confidence: confidenceSchema,
      suggestedTags: z.array(suggestedTagSchema).max(3).optional(),
      shelfLifeDays: shelfLifeSchema.optional(),
    }).strict()),
    ambiguities: z.array(z.string()),
  }).strict(),
  z.object({
    kind: z.literal("prepared_dish"),
    dishName: z.string().nullable(),
    cuisine: z.string().nullable(),
    summary: z.string(),
    visibleIngredients: z.array(z.string()),
    likelyHiddenIngredients: z.array(z.string()),
    cookingMethodHints: z.array(z.string()),
    estimatedServingsOnPlate: z.number().positive().nullable(),
    estimatedMacros: z.object({
      calories: z.number().nonnegative().nullable(),
      proteinG: z.number().nonnegative().nullable(),
      carbsG: z.number().nonnegative().nullable(),
      fatG: z.number().nonnegative().nullable(),
    }).strict(),
    confidence: confidenceSchema,
    suggestedTags: z.array(suggestedTagSchema).max(3).optional(),
    shelfLifeDays: shelfLifeSchema.optional(),
  }).strict(),
  z.object({
    kind: z.literal("ingredients_or_fridge"),
    scene: z.enum(["fridge", "freezer", "pantry", "countertop"]),
    detectedItems: z.array(z.object({
      name: z.string(),
      estimatedQuantity: z.number().positive(),
      unit: z.string(),
      freshnessHint: z.string().nullable(),
      confidence: confidenceSchema,
      suggestedTags: z.array(suggestedTagSchema).max(3).optional(),
      shelfLifeDays: shelfLifeSchema.optional(),
    }).strict()),
  }).strict(),
  z.object({
    kind: z.literal("nutrition_label"),
    productName: z.string().nullable(),
    brand: z.string().nullable(),
    servingSize: z.number().positive().nullable(),
    servingUnit: z.string().nullable(),
    per100gMacros: z.object({
      calories: z.number().nonnegative().nullable(),
      proteinG: z.number().nonnegative().nullable(),
      carbsG: z.number().nonnegative().nullable(),
      fatG: z.number().nonnegative().nullable(),
    }).strict(),
    perServingMacros: z.object({
      calories: z.number().nonnegative().nullable(),
      proteinG: z.number().nonnegative().nullable(),
      carbsG: z.number().nonnegative().nullable(),
      fatG: z.number().nonnegative().nullable(),
    }).strict(),
    confidence: confidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("other"),
    summary: z.string(),
    isKitchenRelevant: z.boolean(),
  }).strict(),
]);

export type VisionExtractorOutput = z.output<typeof visionExtractorOutputSchema>;

export function visionSkillImages(
  attachments: NonNullable<ConversationStreamInput["attachments"]>,
): z.output<typeof visionExtractorInputSchema>["images"] {
  return attachments.map(({ mimeType, base64Data }) => ({ mimeType, base64Data }));
}

function prompt(input: z.output<typeof visionExtractorInputSchema>): string {
  return [
    "<role>Classify and extract one kitchen photo scenario accurately.</role>",
    "<rules>",
    "Handle English and Hungarian grocery receipts, including common abbreviations.",
    "Expand product names when clear; preserve raw receipt text and never invent illegible numbers.",
    "Exclude bags, toiletries, cleaning supplies, and other non-food rows from receipt import.",
    "For each identifiable food receipt row, estimate calories, protein, carbs, fat and fiber per ONE of its stated quantity units, not per 100g or per entire purchase unless that is the unit. For example, for grams divide typical per-100g nutrition by 100. Use null for values that cannot be reasonably estimated, especially when package size is unknown. These are estimates, not label measurements.",
    "Estimate prepared-dish portion macros conservatively and distinguish visible ingredients from likely hidden staples.",
    "</rules>",
    `<context>Caption: ${input.userCaption ?? "No caption was provided."}\nLocale: ${input.userLocale}\nCurrency: ${input.defaultCurrency}</context>`,
    "<output_format>Return exactly the structured VisionExtractionResultSchema JSON. Use null for unsupported or illegible values.</output_format>",
  ].join("\n");
}

export async function executeVisionExtractor(
  input: unknown,
): Promise<Result<SkillRun<z.output<typeof visionExtractorInputSchema>, VisionExtractorOutput>, AppError>> {
  const parsed = visionExtractorInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION_ERROR", message: parsed.error.issues.map((issue) => issue.message).join("; ") });
  }
  const started = Date.now();
  const generated = await generateStructuredMultimodal({
    schema: visionExtractorOutputSchema,
    system: "You are a strict multimodal kitchen image extractor. No chat history is available.",
    prompt: prompt(parsed.data),
    images: parsed.data.images,
  });
  if (!generated.success) return err(generated.error);
  return ok({
    input: parsed.data,
    output: generated.data.output,
    latencyMs: Date.now() - started,
    usage: generated.data.usage,
  });
}
