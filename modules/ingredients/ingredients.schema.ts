import { z } from "zod";

export const baseUnitSchema = z.enum(["g", "ml", "pcs"]).describe("Supported base unit.");

export const ingredientSchema = z
  .object({
    id: z.string().uuid().describe("Ingredient identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    name: z.string().min(1).describe("Ingredient name."),
    brand: z.string().nullable().describe("Brand name, if known."),
    category: z.string().nullable().describe("Ingredient category, if assigned."),
    imageUrl: z.string().url().nullable().describe("Image URL, if available."),
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
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("An ingredient with nutrition and optional price information.");

export const createIngredientSchema = ingredientSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .describe("Input for creating an ingredient.");

export const updateIngredientSchema = createIngredientSchema
  .partial()
  .describe("Fields that can be changed for an ingredient.");

export type IngredientDto = z.infer<typeof ingredientSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
