export * from "./profile/profile.schema";
export * from "./ingredients/ingredients.schema";
export * from "./recipes/recipes.schema";
export * from "./inventory/inventory.schema";
export * from "./meal-logs/meal-logs.schema";
export * from "./chat/chat.schema";
export * from "./shopping/shopping.schema";
export * from "./meal-suggestions/meal-suggestions.schema";
export * from "./tags/tags.schema";
export * from "./media/media.schema";
export * from "./mealdb/mealdb.schema";
export * from "./budget/expense-categories.schema";
export * from "./budget/merchants.schema";
export * from "./budget/receipts.schema";
export * from "./budget/budget.schema";
export {
  extractMealDbMealImageName,
  normalizeMealDbIngredientImageName,
  resolveEntityImages,
  resolveMealDbImageUrl,
} from "./mealdb/mealdb-image.utils";

import {
  profileSchema,
  updateProfileSchema,
} from "./profile/profile.schema";
import {
  ingredientSchema,
  createIngredientSchema,
  updateIngredientSchema,
  listIngredientsQuerySchema,
} from "./ingredients/ingredients.schema";
import {
  recipeSchema,
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
  cookRecipeInputSchema,
} from "./recipes/recipes.schema";
import {
  inventoryItemSchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryQuerySchema,
  expiringInventoryQuerySchema,
  adjustInventoryInputSchema,
  consumeInventoryInputSchema,
} from "./inventory/inventory.schema";
import {
  mealLogSchema,
  createMealLogSchema,
  listMealLogsQuerySchema,
  dailySummaryQuerySchema,
  deleteMealLogQuerySchema,
  deleteMealLogInputSchema,
} from "./meal-logs/meal-logs.schema";
import {
  chatSchema,
  conversationItemSchema,
  listConversationsQuerySchema,
  createConversationInputSchema,
  updateConversationTitleSchema,
  conversationItemsQuerySchema,
  conversationStreamInputSchema,
  createChatInputSchema,
} from "./chat/chat.schema";

export const schemaCatalog = {
  profile: profileSchema,
  updateProfile: updateProfileSchema,
  ingredients: ingredientSchema,
  createIngredient: createIngredientSchema,
  updateIngredient: updateIngredientSchema,
  listIngredientsQuery: listIngredientsQuerySchema,
  recipes: recipeSchema,
  createRecipe: createRecipeSchema,
  updateRecipe: updateRecipeSchema,
  listRecipesQuery: listRecipesQuerySchema,
  cookRecipe: cookRecipeInputSchema,
  inventory: inventoryItemSchema,
  createInventoryItem: createInventoryItemSchema,
  updateInventoryItem: updateInventoryItemSchema,
  listInventoryQuery: listInventoryQuerySchema,
  expiringInventoryQuery: expiringInventoryQuerySchema,
  adjustInventory: adjustInventoryInputSchema,
  consumeInventory: consumeInventoryInputSchema,
  mealLogs: mealLogSchema,
  createMealLog: createMealLogSchema,
  listMealLogsQuery: listMealLogsQuerySchema,
  dailySummaryQuery: dailySummaryQuerySchema,
  deleteMealLogQuery: deleteMealLogQuerySchema,
  deleteMealLog: deleteMealLogInputSchema,
  chat: chatSchema,
  conversationItem: conversationItemSchema,
  listConversationsQuery: listConversationsQuerySchema,
  createConversation: createConversationInputSchema,
  updateConversationTitle: updateConversationTitleSchema,
  conversationItemsQuery: conversationItemsQuerySchema,
  conversationStream: conversationStreamInputSchema,
  createChat: createChatInputSchema,
} as const;
