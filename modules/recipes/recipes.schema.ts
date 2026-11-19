import { z } from "zod";
import { ingredientSchema } from "../ingredients/ingredients.schema";

export const recipeIngredientSchema = z
  .object({
    id: z.string().uuid().describe("Recipe ingredient identifier."),
    recipeId: z.string().uuid().describe("Owning recipe identifier."),
    ingredientId: z.string().uuid().nullable().describe("Linked ingredient identifier, if known."),
    displayName: z.string().min(1).describe("Ingredient name displayed in the recipe."),
    quantity: z.number().positive().describe("Required ingredient quantity."),
    unit: z.string().min(1).describe("Unit for the ingredient quantity."),
    notes: z.string().nullable().describe("Optional ingredient preparation notes."),
    sortOrder: z.number().int().describe("Display order of the ingredient."),
    linkedIngredient: ingredientSchema.optional().describe("Linked ingredient details, if available."),
  })
  .describe("An ingredient line in a recipe.");

export const recipeSchema = z
  .object({
    id: z.string().uuid().describe("Recipe identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    title: z.string().min(1).describe("Recipe title."),
    description: z.string().nullable().describe("Optional recipe summary."),
    instructions: z.array(z.string().describe("A preparation step.")).describe("Ordered recipe steps."),
    imageUrl: z.string().url().nullable().describe("Image URL, if available."),
    prepTimeMin: z.number().int().nonnegative().nullable().describe("Preparation time in minutes."),
    cookTimeMin: z.number().int().nonnegative().nullable().describe("Cooking time in minutes."),
    servings: z.number().positive().describe("Number of servings produced."),
    isFreezerFriendly: z.boolean().describe("Whether the recipe is suitable for freezing."),
    source: z.enum(["manual", "ai_skill"]).describe("How the recipe was created."),
    ingredients: z.array(recipeIngredientSchema).describe("Ingredients used by this recipe."),
    caloriesPerServing: z.number().nonnegative().nullable().describe("Calories per serving."),
    proteinPerServing: z.number().nonnegative().nullable().describe("Protein grams per serving."),
    carbsPerServing: z.number().nonnegative().nullable().describe("Carbohydrate grams per serving."),
    fatPerServing: z.number().nonnegative().nullable().describe("Fat grams per serving."),
    costPerServing: z.number().nonnegative().nullable().describe("Cost per serving."),
    currency: z.string().describe("ISO currency code used for recipe cost."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("A recipe with ordered ingredients and per-serving estimates.");

export const createRecipeSchema = recipeSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .extend({
    ingredients: z.array(recipeIngredientSchema.omit({ id: true, recipeId: true, linkedIngredient: true })),
    caloriesPerServing: z.number().nonnegative().nullable().optional(),
    proteinPerServing: z.number().nonnegative().nullable().optional(),
    carbsPerServing: z.number().nonnegative().nullable().optional(),
    fatPerServing: z.number().nonnegative().nullable().optional(),
    costPerServing: z.number().nonnegative().nullable().optional(),
  })
  .describe("Input for creating a recipe.");

export const updateRecipeSchema = createRecipeSchema
  .partial()
  .describe("Fields that can be changed for a recipe.");

export const listRecipesQuerySchema = z
  .object({
    search: z.string().optional().describe("Text to match against recipe titles."),
    source: z.enum(["manual", "ai_skill"]).optional().describe("Recipe source filter."),
    isFreezerFriendly: z.enum(["true", "false"]).transform((value) => value === "true").optional()
      .describe("Filter freezer-friendly recipes."),
    maxPrepTimeMin: z.coerce.number().int().nonnegative().optional().describe("Maximum prep time."),
    limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum results."),
    offset: z.coerce.number().int().nonnegative().default(0).describe("Results to skip."),
  })
  .describe("Recipe listing filters.");

export const cookBatchSchema = z
  .object({
    storageLocation: z.enum(["fridge", "freezer", "pantry"]).describe("Storage location."),
    quantity: z.number().positive().describe("Number of portions in this batch."),
    unit: z.string().min(1).optional().describe("Quantity unit, defaulting to portions."),
    expiresAt: z.iso.datetime().optional().describe("Optional expiration timestamp."),
  })
  .describe("One prepared recipe batch.");

export const cookRecipeInputSchema = z
  .object({
    batches: z.array(cookBatchSchema).min(1).describe("Prepared batches to stock."),
    preparedAt: z.iso.datetime().optional().describe("Preparation timestamp."),
  })
  .describe("Input for cooking a recipe and stocking its batches.");

export const recipeIdSchema = z.string().uuid().describe("Recipe identifier.");

export type RecipeIngredientDto = z.infer<typeof recipeIngredientSchema>;
export type RecipeDto = z.infer<typeof recipeSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type CookRecipeInput = z.infer<typeof cookRecipeInputSchema>;
