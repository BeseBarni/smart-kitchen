import { z } from "zod";

export const shoppingItemInputSchema = z.object({
  name: z.string().trim().min(1).max(200).describe("Ingredient name."),
  unit: z.string().trim().min(1).max(50).describe("Quantity unit."),
  quantity: z.number().positive().max(1000000).multipleOf(0.001).describe("Quantity to buy."),
}).strict();

export const addShoppingItemsSchema = z.object({
  items: z.array(shoppingItemInputSchema).min(1).max(100).describe("Ingredients to add."),
}).strict();

export const compareShoppingItemsSchema = z.object({
  items: z.array(shoppingItemInputSchema.extend({
    quantity: z.number().positive().max(1000000).describe("Recipe ingredient quantity."),
  })).min(1).max(100).describe("Recipe ingredients to compare."),
}).strict();

export const shoppingSuggestionSchema = z.object({
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  missingQuantity: z.number().nonnegative(),
  uncertainMatches: z.array(z.string()),
});

export const shoppingItemSchema = shoppingItemInputSchema.extend({
  quantity: z.number().positive().describe("Total quantity to buy."),
  id: z.string().uuid().describe("Shopping item identifier."),
  createdAt: z.iso.datetime().describe("Creation time."),
  updatedAt: z.iso.datetime().describe("Last update time."),
});

export type ShoppingItemInput = z.infer<typeof shoppingItemInputSchema>;
export type ShoppingItemDto = z.infer<typeof shoppingItemSchema>;
export type ShoppingSuggestion = z.infer<typeof shoppingSuggestionSchema>;
