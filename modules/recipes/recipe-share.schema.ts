import { z } from "zod";
import { shelfLifeDaysSchema, tagCategorySchema } from "../tags/tags.schema";

export const shareTokenParamSchema = z.object({
  token: z.string()
    .regex(/^[A-Za-z0-9_-]{21}[AQgw]$/, "Invalid share token.")
    .describe("A canonical URL-safe 128-bit recipe share token."),
}).strict();

export const enableRecipeShareInputSchema = z.object({
  regenerate: z.boolean().optional()
    .describe("Replace the current token and invalidate its public link."),
}).strict().describe("Options for enabling or regenerating a recipe share link.");

export const recipeShareStatusDtoSchema = z.object({
  isShared: z.boolean().describe("Whether the recipe currently has an active public link."),
  shareToken: z.string().regex(/^[A-Za-z0-9_-]{21}[AQgw]$/).nullable(),
  sharedAt: z.iso.datetime().nullable(),
}).strict().describe("The authenticated owner's recipe share status.");

export const sharedRecipePublicDtoSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.array(z.string()),
  prepTimeMin: z.number().int().nonnegative().nullable(),
  cookTimeMin: z.number().int().nonnegative().nullable(),
  servings: z.number().positive(),
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  shelfLifeDays: shelfLifeDaysSchema,
  tags: z.array(z.object({
    slug: z.string(),
    label: z.string(),
    i18nKey: z.string().nullable(),
    category: tagCategorySchema,
    colorToken: z.string().nullable(),
  }).strict()).max(3),
  ingredients: z.array(z.object({
    displayName: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    notes: z.string().nullable(),
    sortOrder: z.number().int(),
  }).strict()),
  imageUrls: z.object({
    small: z.string().min(1).nullable(),
    medium: z.string().min(1).nullable(),
    large: z.string().min(1).nullable(),
    source: z.enum(["upload", "themealdb", "legacy", "none"]),
  }).strict(),
  sharedAt: z.iso.datetime(),
}).strict().describe("A read-only allowlist for a publicly shared recipe.");

export type ShareTokenParam = z.infer<typeof shareTokenParamSchema>;
export type EnableRecipeShareInput = z.infer<typeof enableRecipeShareInputSchema>;
export type RecipeShareStatusDto = z.infer<typeof recipeShareStatusDtoSchema>;
export type SharedRecipePublicDto = z.infer<typeof sharedRecipePublicDtoSchema>;
