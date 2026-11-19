import { z } from "zod";

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
    ingredients: z
      .array(recipeIngredientSchema.omit({ id: true, recipeId: true }))
      .describe("Ingredients used by this recipe."),
  })
  .describe("Input for creating a recipe.");

export const updateRecipeSchema = createRecipeSchema
  .partial()
  .describe("Fields that can be changed for a recipe.");

export type RecipeIngredientDto = z.infer<typeof recipeIngredientSchema>;
export type RecipeDto = z.infer<typeof recipeSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
