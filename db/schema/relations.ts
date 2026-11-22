import { relations } from "drizzle-orm";
import { authUsers, userProfiles } from "./users";
import { ingredients, recipeIngredients, recipes } from "./food";
import { inventoryItems, mealLogs } from "./inventory";
import { conversationItems, conversations } from "./conversations";
import { ingredientTags, inventoryItemTags, recipeTags, tags } from "./tags";
import { expenseCategories } from "./expense-categories";
import { merchants } from "./merchants";
import { receiptItems, receipts } from "./receipts";
import { monthlyBudgetCategoryLimits, monthlyBudgets } from "./budgets";
import { mediaAssets } from "./media";

export const authUsersRelations = relations(authUsers, ({ many, one }) => ({
  profile: one(userProfiles),
  ingredients: many(ingredients),
  recipes: many(recipes),
  inventoryItems: many(inventoryItems),
  mealLogs: many(mealLogs),
  conversations: many(conversations),
  expenseCategories: many(expenseCategories),
  merchants: many(merchants),
  receipts: many(receipts),
  monthlyBudgets: many(monthlyBudgets),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(authUsers, { fields: [userProfiles.userId], references: [authUsers.id] }),
}));

export const ingredientsRelations = relations(ingredients, ({ many, one }) => ({
  user: one(authUsers, { fields: [ingredients.userId], references: [authUsers.id] }),
  recipeIngredients: many(recipeIngredients),
  inventoryItems: many(inventoryItems),
  tags: many(ingredientTags),
  receiptItems: many(receiptItems),
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
  receiptItems: many(receiptItems),
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

export const expenseCategoriesRelations = relations(expenseCategories, ({ many, one }) => ({
  user: one(authUsers, { fields: [expenseCategories.userId], references: [authUsers.id] }),
  receiptItems: many(receiptItems),
  merchantDefaults: many(merchants, { relationName: "merchantDefaultCategory" }),
  budgetLimits: many(monthlyBudgetCategoryLimits),
}));

export const merchantsRelations = relations(merchants, ({ many, one }) => ({
  user: one(authUsers, { fields: [merchants.userId], references: [authUsers.id] }),
  defaultCategory: one(expenseCategories, {
    fields: [merchants.defaultCategoryId],
    references: [expenseCategories.id],
    relationName: "merchantDefaultCategory",
  }),
  receipts: many(receipts),
}));

export const receiptsRelations = relations(receipts, ({ many, one }) => ({
  user: one(authUsers, { fields: [receipts.userId], references: [authUsers.id] }),
  merchant: one(merchants, { fields: [receipts.merchantId], references: [merchants.id] }),
  mediaAsset: one(mediaAssets, { fields: [receipts.mediaAssetId], references: [mediaAssets.id] }),
  items: many(receiptItems),
}));

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, { fields: [receiptItems.receiptId], references: [receipts.id] }),
  category: one(expenseCategories, { fields: [receiptItems.categoryId], references: [expenseCategories.id] }),
  inventoryItem: one(inventoryItems, {
    fields: [receiptItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
  ingredient: one(ingredients, { fields: [receiptItems.ingredientId], references: [ingredients.id] }),
}));

export const monthlyBudgetsRelations = relations(monthlyBudgets, ({ many, one }) => ({
  user: one(authUsers, { fields: [monthlyBudgets.userId], references: [authUsers.id] }),
  categoryLimits: many(monthlyBudgetCategoryLimits),
}));

export const monthlyBudgetCategoryLimitsRelations = relations(
  monthlyBudgetCategoryLimits,
  ({ one }) => ({
    budget: one(monthlyBudgets, {
      fields: [monthlyBudgetCategoryLimits.monthlyBudgetId],
      references: [monthlyBudgets.id],
    }),
    category: one(expenseCategories, {
      fields: [monthlyBudgetCategoryLimits.categoryId],
      references: [expenseCategories.id],
    }),
  }),
);

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  receipts: many(receipts),
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
