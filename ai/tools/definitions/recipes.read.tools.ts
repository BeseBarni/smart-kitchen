import { recipeService } from "@app/modules";
import { listRecipesQuerySchema, recipeIdSchema, recipeSchema } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";
import { recipeCard } from "./recipes.write.tools";

export const recipesListTool = defineTool({
  name: "recipes_list",
  description: "Search the user's saved recipes before proposing duplicate recipes or using an existing recipe.",
  inputSchema: listRecipesQuerySchema.strict(),
  annotations: { readOnlyHint: true },
  execute: (input, context) => recipeService.list(context.userId, input),
});

export const recipesDetailTool = defineTool({
  name: "recipes_get_detail",
  description: "Load a saved recipe's full ingredient list and cooking instructions by ID.",
  inputSchema: z.object({ recipeId: recipeIdSchema }).strict(),
  outputSchema: recipeSchema,
  annotations: { readOnlyHint: true },
  execute: ({ recipeId }, context) => recipeService.getById(context.userId, recipeId),
  toUiDirective: (recipe) => ({
    component: "recipe_preview_card",
    status: "saved",
    recipe: recipeCard(recipe),
    canSave: false,
    canCookAndStock: true,
  }),
});

export const recipeReadTools = [recipesListTool, recipesDetailTool] as const;
