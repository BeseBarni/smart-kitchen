import { ingredientService, createIngredientSchema, generatedShelfLifeDaysSchema } from "@app/modules";
import { z } from "zod";
import { defineTool } from "./tool.types";

export const ingredientsSearchTool = defineTool({
  name: "ingredients_search",
  description: "Search the user's ingredient catalog for known nutrition and price values.",
  inputSchema: z.object({
    query: z.string().trim().min(1).describe("Ingredient name or search phrase."),
  }).strict(),
  annotations: { readOnlyHint: true },
  execute: ({ query }, context) => ingredientService.searchByName(context.userId, query),
});

export const ingredientsCreateTool = defineTool({
  name: "ingredients_create",
  description: "Add a catalog ingredient only when a matching ingredient is not already present.",
  inputSchema: createIngredientSchema.extend({ shelfLifeDays: generatedShelfLifeDaysSchema }).strict(),
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["ingredients"],
  execute: (input, context) => ingredientService.create(context.userId, input),
});

export const ingredientTools = [ingredientsSearchTool, ingredientsCreateTool] as const;
