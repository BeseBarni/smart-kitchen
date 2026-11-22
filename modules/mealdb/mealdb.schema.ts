import { z } from "zod";

export const stockImageKindSchema = z
  .enum(["themealdb_meal", "themealdb_ingredient"])
  .describe("The source type for a persisted normalized stock image.");

export const stockImageRefSchema = z
  .object({
    stockImageKind: stockImageKindSchema.nullable(),
    stockImageName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .nullable(),
  })
  .superRefine((value, context) => {
    if ((value.stockImageKind === null) !== (value.stockImageName === null)) {
      context.addIssue({
        code: "custom",
        message: "Stock image kind and name must be set together or both be null.",
      });
    }
  })
  .describe("A normalized TheMealDB stock image reference.");

export const resolvedImageUrlsSchema = z
  .object({
    small: z.string().url().nullable(),
    medium: z.string().url().nullable(),
    large: z.string().url().nullable(),
    source: z.enum(["upload", "themealdb", "legacy", "none"]),
  })
  .describe("Size-aware resolved image URLs and their source.");

export const mealDbImageCandidateSchema = z
  .object({
    label: z.string().min(1),
    stockImageKind: stockImageKindSchema,
    stockImageName: z.string().min(1),
    previewUrl: z.string().url(),
  })
  .describe("A compact verified TheMealDB image candidate.");

export const mealDbSearchQuerySchema = z
  .object({
    kind: z.enum(["meal", "ingredient"]).describe("Type of stock image to search."),
    q: z.string().trim().min(1).max(200).describe("Image search query."),
    mainIngredient: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(6).default(6),
  })
  .describe("TheMealDB stock image search filters.");

export type StockImageKind = z.infer<typeof stockImageKindSchema>;
export type StockImageRef = z.infer<typeof stockImageRefSchema>;
export type ResolvedImageUrls = z.infer<typeof resolvedImageUrlsSchema>;
export type MealDbImageCandidate = z.infer<typeof mealDbImageCandidateSchema>;
