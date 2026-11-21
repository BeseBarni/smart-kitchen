import { z } from "zod";

export const tagCategorySchema = z.enum([
  "dietary",
  "nutrition",
  "prep",
  "flavor",
  "custom",
]).describe("Chip category.");

export const tagDtoSchema = z.object({
  id: z.string().uuid().describe("Tag identifier."),
  slug: z.string().trim().min(1).max(80).describe("Normalized tag slug."),
  label: z.string().trim().min(1).max(80).describe("Human-readable tag label."),
  i18nKey: z.string().nullable().describe("Canonical localization key."),
  category: tagCategorySchema,
  colorToken: z.string().nullable().describe("Stitch-aligned semantic badge token."),
}).strict().describe("A reusable inventory, recipe, or ingredient chip.");

export const rawTagSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().min(1).max(80),
  category: tagCategorySchema.optional(),
}).strict().describe("Tag input before canonical resolution.");

export const shelfLifeDaysSchema = z.object({
  fridge: z.number().int().positive().nullable().optional(),
  freezer: z.number().int().positive().nullable().optional(),
  pantry: z.number().int().positive().nullable().optional(),
}).strict().describe("Typical shelf life in days by storage method.");

export const tagAttributeListSchema = z.array(rawTagSchema).max(3)
  .describe("Up to three attribute chips; item type is an additional fourth chip.");

export const listTagsQuerySchema = z.object({
  search: z.string().trim().optional().describe("Optional tag name or slug search."),
  category: tagCategorySchema.optional().describe("Optional tag category."),
}).strict();

export const resolveTagsInputSchema = z.object({
  tags: tagAttributeListSchema,
}).strict();

export type TagCategory = z.infer<typeof tagCategorySchema>;
export type TagDto = z.infer<typeof tagDtoSchema>;
export type RawTagInput = z.infer<typeof rawTagSchema>;
export type ShelfLifeDays = z.infer<typeof shelfLifeDaysSchema>;
