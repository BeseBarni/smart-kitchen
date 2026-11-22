import { z } from "zod";
import { rawTagSchema, shelfLifeDaysSchema, tagDtoSchema } from "../tags/tags.schema";
import { resolvedImageUrlsSchema, stockImageKindSchema } from "../mealdb/mealdb.schema";

export const baseUnitSchema = z.enum(["g", "ml", "pcs"]).describe("Supported base unit.");

export const ingredientSchema = z
  .object({
    id: z.string().uuid().describe("Ingredient identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    name: z.string().min(1).describe("Ingredient name."),
    brand: z.string().nullable().describe("Brand name, if known."),
    category: z.string().nullable().describe("Ingredient category, if assigned."),
    imageUrl: z.string().min(1).nullable().describe("Image URL, if available."),
    imageAssetId: z.string().uuid().nullable().optional().describe("Uploaded media asset, if available."),
    stockImageKind: stockImageKindSchema.nullable().optional().describe("The normalized TheMealDB stock image kind."),
    stockImageName: z.string().trim().min(1).max(255).nullable().optional().describe("The normalized TheMealDB stock image name."),
    imageUrls: resolvedImageUrlsSchema.optional().describe("Resolved small, medium, and large image URLs."),
    defaultUnit: baseUnitSchema.describe("Default measurement unit."),
    baseQuantity: z.number().nonnegative().describe("Quantity the nutrition values describe."),
    calories: z.number().nonnegative().nullable().describe("Calories per base quantity."),
    proteinG: z.number().nonnegative().nullable().describe("Protein grams per base quantity."),
    carbsG: z.number().nonnegative().nullable().describe("Carbohydrate grams per base quantity."),
    fatG: z.number().nonnegative().nullable().describe("Fat grams per base quantity."),
    fiberG: z.number().nonnegative().nullable().describe("Fiber grams per base quantity."),
    priceAmount: z.number().nonnegative().nullable().describe("Price amount, if known."),
    priceQuantity: z.number().positive().nullable().describe("Quantity covered by the price."),
    priceUnit: z.string().nullable().describe("Unit used for the price quantity."),
    currency: z.string().describe("ISO currency code used for the price."),
    shelfLifeDays: shelfLifeDaysSchema
      .optional()
      .describe("Typical shelf life in days by storage method."),
    tags: z.array(tagDtoSchema).max(3)
      .optional()
      .describe("Up to three persisted attribute chips."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("An ingredient with nutrition and optional price information.");

export const createIngredientSchema = ingredientSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .extend({
    stockImageKind: stockImageKindSchema.nullable().optional(),
    stockImageName: z.string().trim().min(1).max(255).nullable().optional(),
    shelfLifeDays: shelfLifeDaysSchema.optional()
      .describe("Typical shelf life in days by storage method."),
    tags: z.array(rawTagSchema).max(3).optional()
      .describe("Up to three attribute tags to resolve."),
  })
  .describe("Input for creating an ingredient.");

export const updateIngredientSchema = createIngredientSchema
  .partial()
  .describe("Fields that can be changed for an ingredient.");

export const listIngredientsQuerySchema = z
  .object({
    search: z.string().optional().describe("Text to match against ingredient names."),
    category: z.string().optional().describe("Restrict results to a category."),
    limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum results."),
    offset: z.coerce.number().int().nonnegative().default(0).describe("Results to skip."),
  })
  .describe("Ingredient listing filters.");

export const ingredientIdSchema = z.string().uuid().describe("Ingredient identifier.");

export type IngredientDto = z.infer<typeof ingredientSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type ListIngredientsQuery = z.infer<typeof listIngredientsQuerySchema>;
