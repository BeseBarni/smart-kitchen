import { relations } from "drizzle-orm";
import { authUsers, userProfiles } from "./users";
import { ingredients, recipeIngredients, recipes } from "./food";
import { inventoryItems, mealLogs } from "./inventory";
import { conversationItems, conversations } from "./conversations";
import { ingredientTags, inventoryItemTags, recipeTags, tags } from "./tags";

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
  tags: many(ingredientTags),
}));

export const recipesRelations = relations(recipes, ({ many, one }) => ({
  user: one(authUsers, { fields: [recipes.userId], references: [authUsers.id] }),
  ingredients: many(recipeIngredients),
  inventoryItems: many(inventoryItems),
  mealLogs: many(mealLogs),
  tags: many(recipeTags),
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
  tags: many(inventoryItemTags),
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

export const tagsRelations = relations(tags, ({ many, one }) => ({
  user: one(authUsers, { fields: [tags.userId], references: [authUsers.id] }),
  recipeTags: many(recipeTags),
  ingredientTags: many(ingredientTags),
  inventoryItemTags: many(inventoryItemTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeTags.recipeId], references: [recipes.id] }),
  tag: one(tags, { fields: [recipeTags.tagId], references: [tags.id] }),
}));

export const ingredientTagsRelations = relations(ingredientTags, ({ one }) => ({
  ingredient: one(ingredients, { fields: [ingredientTags.ingredientId], references: [ingredients.id] }),
  tag: one(tags, { fields: [ingredientTags.tagId], references: [tags.id] }),
}));

export const inventoryItemTagsRelations = relations(inventoryItemTags, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryItemTags.inventoryItemId],
    references: [inventoryItems.id],
  }),
  tag: one(tags, { fields: [inventoryItemTags.tagId], references: [tags.id] }),
}));
