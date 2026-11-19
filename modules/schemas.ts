export * from "./profile/profile.schema";
export * from "./ingredients/ingredients.schema";
export * from "./recipes/recipes.schema";
export * from "./inventory/inventory.schema";
export * from "./meal-logs/meal-logs.schema";
export * from "./chat/chat.schema";

import {
  profileSchema,
  updateProfileSchema,
} from "./profile/profile.schema";
import { ingredientSchema, createIngredientSchema } from "./ingredients/ingredients.schema";
import { recipeSchema, createRecipeSchema } from "./recipes/recipes.schema";
import { inventoryItemSchema, createInventoryItemSchema } from "./inventory/inventory.schema";
import { mealLogSchema, createMealLogSchema } from "./meal-logs/meal-logs.schema";
import { chatSchema, conversationItemSchema } from "./chat/chat.schema";

export const schemaCatalog = {
  profile: profileSchema,
  updateProfile: updateProfileSchema,
  ingredients: ingredientSchema,
  createIngredient: createIngredientSchema,
  recipes: recipeSchema,
  createRecipe: createRecipeSchema,
  inventory: inventoryItemSchema,
  createInventoryItem: createInventoryItemSchema,
  mealLogs: mealLogSchema,
  createMealLog: createMealLogSchema,
  chat: chatSchema,
  conversationItem: conversationItemSchema,
} as const;
