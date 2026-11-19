import { relations } from "drizzle-orm";
import { authUsers, userProfiles } from "./users";
import { ingredients, recipeIngredients, recipes } from "./food";
import { inventoryItems, mealLogs } from "./inventory";
import { conversationItems, conversations } from "./conversations";

export const authUsersRelations = relations(authUsers, ({ many, one }) => ({
  profile: one(userProfiles),
  ingredients: many(ingredients),
  recipes: many(recipes),
  inventoryItems: many(inventoryItems),
  mealLogs: many(mealLogs),
  conversations: many(conversations),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(authUsers, { fields: [userProfiles.userId], references: [authUsers.id] }),
}));

export const ingredientsRelations = relations(ingredients, ({ many, one }) => ({
  user: one(authUsers, { fields: [ingredients.userId], references: [authUsers.id] }),
  recipeIngredients: many(recipeIngredients),
  inventoryItems: many(inventoryItems),
}));

export const recipesRelations = relations(recipes, ({ many, one }) => ({
  user: one(authUsers, { fields: [recipes.userId], references: [authUsers.id] }),
  ingredients: many(recipeIngredients),
  inventoryItems: many(inventoryItems),
  mealLogs: many(mealLogs),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many, one }) => ({
  user: one(authUsers, { fields: [inventoryItems.userId], references: [authUsers.id] }),
  recipe: one(recipes, { fields: [inventoryItems.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, { fields: [inventoryItems.ingredientId], references: [ingredients.id] }),
  mealLogs: many(mealLogs),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  user: one(authUsers, { fields: [mealLogs.userId], references: [authUsers.id] }),
  inventoryItem: one(inventoryItems, {
    fields: [mealLogs.inventoryItemId],
    references: [inventoryItems.id],
  }),
  recipe: one(recipes, { fields: [mealLogs.recipeId], references: [recipes.id] }),
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  user: one(authUsers, { fields: [conversations.userId], references: [authUsers.id] }),
  items: many(conversationItems),
}));

export const conversationItemsRelations = relations(conversationItems, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationItems.conversationId],
    references: [conversations.id],
  }),
}));
