import { z } from "zod";
import { err, ok, type AppError, type Result } from "@app/shared";
import { generateStructuredMultimodal } from "../core/llm.client";
import type { SkillRun } from "./skill.types";
import { estimatedMacrosPerUnitSchema, generatedShelfLifeDaysSchema, type ConversationStreamInput } from "@app/modules/schemas";
import { languageReminder } from "../agents/language";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const suggestedTagSchema = z.object({
  slug: z.string().optional(),
  label: z.string().min(1),
  category: z.enum(["dietary", "nutrition", "prep", "flavor", "custom"]).optional(),
}).strict();
export const visionExtractorInputSchema = z
  .object({
    images: z.array(z.object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]),
      base64Data: z.string().min(1),
    }).strict()).min(1).max(3),
    userCaption: z.string().trim().max(4000).optional(),
    userLocale: z.enum(["en", "hu", "es"]),
    defaultCurrency: z.string().trim().min(1).max(8),
    availableCategories: z.array(z.object({
      slug: z.string().trim().min(1),
      label: z.string().trim().min(1),
    }).strict()).optional(),
    knownMerchants: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .strict();

const receiptOutputSchema = z.object({
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
      amount: z.number().nonnegative(),
      categorySlug: z.string().trim().min(1),
      suggestedStorageLocation: z.enum(["fridge", "freezer", "pantry"]).nullable(),
      estimatedShelfLifeDays: z.number().positive().nullable(),
      expiresAt: z.iso.datetime().nullable().describe("Explicitly visible, unambiguous expiration timestamp, or null; never infer a label date."),
      estimatedMacrosPerUnit: estimatedMacrosPerUnitSchema.nullable()
        .describe("Estimated nutrition for exactly one of the line item's quantity units, or null if not reasonably estimable."),
      imageSearchTerm: z.string().trim().min(1).nullable()
        .describe("English generic ingredient name for image lookup, or null for non-food or unidentifiable items."),
      isFoodItem: z.boolean(),
      confidence: confidenceSchema,
      suggestedTags: z.array(suggestedTagSchema).max(3).optional(),
      shelfLifeDays: generatedShelfLifeDaysSchema,
    }).strict()),
    ambiguities: z.array(z.string()),
  }).strict();

const otherOutputSchema = z.object({
  kind: z.literal("other"),
  summary: z.string(),
  isKitchenRelevant: z.boolean(),
}).strict();

export const visionExtractorOutputSchema = z.discriminatedUnion("kind", [
  receiptOutputSchema,
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
    shelfLifeDays: generatedShelfLifeDaysSchema,
  }).strict(),
  z.object({
    kind: z.literal("ingredients_or_fridge"),
    scene: z.enum(["fridge", "freezer", "pantry", "countertop"]),
    detectedItems: z.array(z.object({
      name: z.string(),
      estimatedQuantity: z.number().positive(),
      unit: z.string(),
      freshnessHint: z.string().nullable(),
      expiresAt: z.iso.datetime().nullable().describe("Explicitly visible, unambiguous expiration timestamp, or null; never infer a label date."),
      confidence: confidenceSchema,
      suggestedTags: z.array(suggestedTagSchema).max(3).optional(),
      shelfLifeDays: generatedShelfLifeDaysSchema,
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
  otherOutputSchema,
]);

export type VisionExtractorOutput = z.output<typeof visionExtractorOutputSchema>;

export const receiptPreviewExtractorOutputSchema = z.discriminatedUnion("kind", [
  receiptOutputSchema.omit({ totalAmount: true }).extend({
    lineItems: z.array(receiptOutputSchema.shape.lineItems.element.omit({
      expiresAt: true,
    })),
  }),
  otherOutputSchema.pick({ kind: true }),
]);

export function visionSkillImages(
  attachments: NonNullable<ConversationStreamInput["attachments"]>,
): z.output<typeof visionExtractorInputSchema>["images"] {
  return attachments.map(({ mimeType, base64Data }) => ({ mimeType, base64Data }));
}

function prompt(input: z.output<typeof visionExtractorInputSchema>, receiptPreview: boolean): string {
  const categories = input.availableCategories?.map((category) => `${category.slug} (${category.label})`).join(", ");
  const merchants = input.knownMerchants?.join(", ");
  return [
    receiptPreview
      ? "<role>Identify and extract a grocery receipt accurately. If the image is not a receipt, return kind other.</role>"
      : "<role>Classify and extract one kitchen photo scenario accurately.</role>",
    "<rules>",
    "Handle English and Hungarian grocery receipts, including common abbreviations.",
    "Expand product names when clear; preserve raw receipt text and never invent illegible numbers.",
    "For receipt images, keep EVERY genuine purchased line item: groceries, cleaning supplies, toiletries, pet food, litter, pharmacy goods, tickets, entertainment, plastic bags, and deposit fees.",
    "Assign each receipt row exactly one categorySlug from the available category list. Use `food` for edible groceries, `household` for cleaning/pet/pharmacy/home goods, `entertainment` for tickets/media, and `other` for ambiguities or fees.",
    "Use `amount` as the exact paid line total after line discounts. Put only unallocated basket-wide discounts or uncertain totals in ambiguities[]. Never invent a line amount.",
    "Exclude VAT/ÁFA summary rows, subtotals, card-payment rows, loyalty totals, change due, and other receipt metadata, but preserve itemized paid bags or DRS/palackbetét deposit fees.",
    "Prefer one of the known merchant names for the merchant field instead of copying legal suffixes. Categories: " + (categories ?? "food, household, entertainment, other") + ".",
    "Known merchants: " + (merchants ?? "none"),
    "For every identifiable food receipt row, estimate calories, protein, carbs, fat and fiber per ONE of its stated quantity units, not per 100g or per entire purchase unless that is the unit. For example, for grams divide typical per-100g nutrition by 100. Use null for values that cannot be reasonably estimated, especially when package size is unknown; use null for non-food. These are estimates, not label measurements.",
    "For each identifiable food receipt row, provide imageSearchTerm as a concise English generic ingredient name for a stock image search, regardless of receipt language. Use null for non-food or unidentifiable items; do not generate image URLs.",
    ...(receiptPreview ? [] : [
      "Estimate prepared-dish portion macros conservatively and distinguish visible ingredients from likely hidden staples.",
    ]),
    "For every detected food or prepared dish provide conservative shelfLifeDays estimates in days for fridge, freezer, and pantry. Use null for unsuitable or unknown storage methods; estimates are not proof of freshness or safety. For receipt rows estimatedShelfLifeDays must match the suggested storage method.",
    ...(receiptPreview ? [] : ["Only provide expiresAt when an unambiguous expiration date is explicitly visible; otherwise use null. Never guess a printed date or use a purchase date as an expiry."]),
    "</rules>",
    `<context>Caption: ${input.userCaption ?? "No caption was provided."}\nLocale: ${input.userLocale}\nCurrency: ${input.defaultCurrency}</context>`,
    receiptPreview
      ? "<output_format>Return exactly the requested structured JSON. Use null for unsupported or illegible values.</output_format>"
      : "<output_format>Return exactly the structured VisionExtractionResultSchema JSON. Use null for unsupported or illegible values.</output_format>",
  ].join("\n");
}

async function executeExtractor<TSchema extends z.ZodType>(
  input: unknown,
  schema: TSchema,
  receiptPreview: boolean,
): Promise<Result<SkillRun<z.output<typeof visionExtractorInputSchema>, z.output<TSchema>>, AppError>> {
  const parsed = visionExtractorInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION_ERROR", message: parsed.error.issues.map((issue) => issue.message).join("; ") });
  }
  const started = Date.now();
  const generated = await generateStructuredMultimodal({
    schema,
    system: `You are a strict multimodal kitchen image extractor. No chat history is available.\n${languageReminder(parsed.data.userLocale)}`,
    prompt: prompt(parsed.data, receiptPreview),
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

export async function executeVisionExtractor(
  input: unknown,
): Promise<Result<SkillRun<z.output<typeof visionExtractorInputSchema>, VisionExtractorOutput>, AppError>> {
  return executeExtractor(input, visionExtractorOutputSchema, false);
}

export async function executeReceiptPreviewExtractor(
  input: unknown,
): Promise<Result<SkillRun<z.output<typeof visionExtractorInputSchema>, z.output<typeof receiptPreviewExtractorOutputSchema>>, AppError>> {
  return executeExtractor(input, receiptPreviewExtractorOutputSchema, true);
}
