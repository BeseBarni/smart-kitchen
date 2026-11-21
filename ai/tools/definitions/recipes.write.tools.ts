import {
  recipeService,
  createRecipeSchema,
  cookRecipeInputSchema,
  cookBatchSchema,
  inventoryItemSchema,
  recipeIngredientSchema,
  recipeSchema,
  generatedShelfLifeDaysSchema,
} from "@app/modules";
import type { InventoryItemDto, RecipeDto } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

export function recipeCard(recipe: RecipeDto) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? "",
    imageUrl: recipe.imageUrl,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    isFreezerFriendly: recipe.isFreezerFriendly,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map(({ displayName, quantity, unit }) => ({
      name: displayName,
      quantity,
      unit,
    })),
    instructions: recipe.instructions,
    caloriesPerServing: recipe.caloriesPerServing,
    proteinPerServing: recipe.proteinPerServing,
    carbsPerServing: recipe.carbsPerServing,
    fatPerServing: recipe.fatPerServing,
    fiberPerServing: recipe.fiberPerServing,
    costPerServing: recipe.costPerServing,
    currency: recipe.currency,
    shelfLifeDays: recipe.shelfLifeDays,
    tags: recipe.tags?.map(({ slug, label, category }) => ({ slug, label, category })),
  };
}

const strictCreateRecipeSchema = createRecipeSchema.extend({
  fiberPerServing: z.number().nonnegative().describe("Fiber grams per serving, estimated when necessary."),
  shelfLifeDays: generatedShelfLifeDaysSchema,
  ingredients: z.array(
    recipeIngredientSchema
      .omit({ id: true, recipeId: true, linkedIngredient: true })
      .strict()
      .describe("Recipe ingredient."),
  ).describe("Recipe ingredient lines."),
}).strict();

const strictCookInputSchema = z.object({
  batches: z.array(cookBatchSchema.strict()).min(1).describe("Prepared batches to stock."),
  preparedAt: cookRecipeInputSchema.shape.preparedAt,
}).strict();

export const recipeCreateTool = defineTool({
  name: "recipes_create",
  description: "Save a recipe only after the user approves its draft.",
  inputSchema: strictCreateRecipeSchema,
  outputSchema: recipeSchema,
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["recipes"],
  execute: (input, context) => recipeService.create(context.userId, input),
  toUiDirective: (recipe) => ({
    component: "recipe_preview_card",
    status: "saved",
    recipe: recipeCard(recipe),
    canSave: false,
    canCookAndStock: true,
  }),
});

export const recipeCookAndStockTool = defineTool({
  name: "recipes_cook_and_stock",
  description: "Stock cooked batches from a saved recipe in the requested storage locations.",
  inputSchema: z.object({
    recipeId: z.string().uuid().describe("Saved recipe identifier."),
    ...strictCookInputSchema.shape,
  }).strict(),
  outputSchema: inventoryItemSchema.array(),
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["inventory"],
  execute: ({ recipeId, ...input }, context) =>
    recipeService.cookAndStock(context.userId, recipeId, input),
  toUiDirective: (items: InventoryItemDto[]) => ({
    component: "inventory_action_card",
    action: "added",
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.remainingQuantity,
      unit: item.unit,
      location: item.storageLocation,
    })),
  }),
});

export const recipeWriteTools = [recipeCreateTool, recipeCookAndStockTool] as const;
