import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "./index";
import {
  authUsers,
  conversationItems,
  conversations,
  ingredients,
  inventoryItems,
  mealLogs,
  recipeIngredients,
  recipes,
  userProfiles,
} from "./schema";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), quiet: true });

const ids = {
  chicken: "10000000-0000-4000-8000-000000000001",
  rice: "10000000-0000-4000-8000-000000000002",
  tomatoes: "10000000-0000-4000-8000-000000000003",
  beans: "10000000-0000-4000-8000-000000000004",
  mozzarella: "10000000-0000-4000-8000-000000000005",
  chiliRecipe: "20000000-0000-4000-8000-000000000001",
  riceRecipe: "20000000-0000-4000-8000-000000000002",
  chiliChicken: "30000000-0000-4000-8000-000000000001",
  chiliBeans: "30000000-0000-4000-8000-000000000002",
  riceChicken: "30000000-0000-4000-8000-000000000003",
  riceTomatoes: "30000000-0000-4000-8000-000000000004",
  chiliBatch: "40000000-0000-4000-8000-000000000001",
  riceBatch: "40000000-0000-4000-8000-000000000002",
  chickenPack: "40000000-0000-4000-8000-000000000003",
  mozzarellaPack: "40000000-0000-4000-8000-000000000004",
  mealLog: "50000000-0000-4000-8000-000000000001",
  conversation: "60000000-0000-4000-8000-000000000001",
  message: "70000000-0000-4000-8000-000000000001",
  toolCall: "70000000-0000-4000-8000-000000000002",
  toolResult: "70000000-0000-4000-8000-000000000003",
} as const;

async function seed(): Promise<void> {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    throw new Error("SEED_USER_ID is required and must identify an existing Neon Auth user.");
  }

  const database = getDatabase();

  try {
    await database.transaction(async (tx) => {
      const [seedUser] = await tx
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);
      if (!seedUser) throw new Error("SEED_USER_ID does not match an existing Neon Auth user.");

      await tx
        .insert(userProfiles)
        .values({
          userId,
          dailyCalorieTarget: 2200,
          dailyProteinG: 140,
          dailyCarbsG: 250,
          dailyFatG: 75,
          dietaryPreferences: { allergies: [], dislikes: [], goals: "Balanced meals" },
          currency: "HUF",
          unitSystem: "metric",
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            dailyCalorieTarget: 2200,
            dailyProteinG: 140,
            dailyCarbsG: 250,
            dailyFatG: 75,
            dietaryPreferences: { allergies: [], dislikes: [], goals: "Balanced meals" },
            currency: "HUF",
            unitSystem: "metric",
            updatedAt: new Date(),
          },
        });

      const ingredientsToSeed = [
        {
          id: ids.chicken,
          userId,
          name: "Chicken breast",
          category: "Meat",
          defaultUnit: "g",
          baseQuantity: "100.00",
          calories: "120.00",
          proteinG: "22.50",
          carbsG: "0.00",
          fatG: "2.60",
          fiberG: "0.00",
          priceAmount: "1299.00",
          priceQuantity: "500.00",
          priceUnit: "g",
          currency: "HUF",
        },
        {
          id: ids.rice,
          userId,
          name: "Long grain rice",
          category: "Grains",
          defaultUnit: "g",
          baseQuantity: "100.00",
          calories: "360.00",
          proteinG: "7.10",
          carbsG: "78.00",
          fatG: "0.70",
          fiberG: "1.30",
          priceAmount: "699.00",
          priceQuantity: "1000.00",
          priceUnit: "g",
          currency: "HUF",
        },
        {
          id: ids.tomatoes,
          userId,
          name: "Chopped tomatoes",
          category: "Vegetables",
          defaultUnit: "g",
          baseQuantity: "100.00",
          calories: "24.00",
          proteinG: "1.20",
          carbsG: "3.90",
          fatG: "0.30",
          fiberG: "1.50",
          priceAmount: "499.00",
          priceQuantity: "400.00",
          priceUnit: "g",
          currency: "HUF",
        },
        {
          id: ids.beans,
          userId,
          name: "Kidney beans",
          category: "Legumes",
          defaultUnit: "g",
          baseQuantity: "100.00",
          calories: "127.00",
          proteinG: "8.70",
          carbsG: "22.80",
          fatG: "0.50",
          fiberG: "6.40",
          priceAmount: "549.00",
          priceQuantity: "400.00",
          priceUnit: "g",
          currency: "HUF",
        },
        {
          id: ids.mozzarella,
          userId,
          name: "Mozzarella",
          category: "Dairy",
          defaultUnit: "g",
          baseQuantity: "100.00",
          calories: "280.00",
          proteinG: "28.00",
          carbsG: "2.20",
          fatG: "17.00",
          fiberG: "0.00",
          priceAmount: "899.00",
          priceQuantity: "125.00",
          priceUnit: "g",
          currency: "HUF",
        },
      ] satisfies (typeof ingredients.$inferInsert)[];

      for (const ingredient of ingredientsToSeed) {
        await tx
          .insert(ingredients)
          .values(ingredient)
          .onConflictDoUpdate({ target: ingredients.id, set: ingredient });
      }

      const recipesToSeed = [
        {
          id: ids.chiliRecipe,
          userId,
          title: "Chicken and bean chili",
          description: "A freezer-friendly batch meal.",
          instructions: [
            "Brown the chicken in a large pot.",
            "Add tomatoes and beans, then simmer until cooked through.",
          ],
          prepTimeMin: 15,
          cookTimeMin: 35,
          servings: "4.00",
          isFreezerFriendly: true,
          source: "manual",
          caloriesPerServing: "390.00",
          proteinPerServing: "42.00",
          carbsPerServing: "34.00",
          fatPerServing: "9.00",
          costPerServing: "620.00",
          currency: "HUF",
        },
        {
          id: ids.riceRecipe,
          userId,
          title: "Tomato chicken rice bowls",
          description: "A simple meal-prep rice bowl.",
          instructions: [
            "Cook the rice according to its package directions.",
            "Cook the chicken with tomatoes and serve over rice.",
          ],
          prepTimeMin: 10,
          cookTimeMin: 25,
          servings: "3.00",
          isFreezerFriendly: true,
          source: "ai_skill",
          caloriesPerServing: "510.00",
          proteinPerServing: "38.00",
          carbsPerServing: "64.00",
          fatPerServing: "8.00",
          costPerServing: "710.00",
          currency: "HUF",
        },
      ] satisfies (typeof recipes.$inferInsert)[];

      for (const recipe of recipesToSeed) {
        await tx.insert(recipes).values(recipe).onConflictDoUpdate({
          target: recipes.id,
          set: recipe,
        });
      }

      const recipeIngredientsToSeed = [
        {
          id: ids.chiliChicken,
          recipeId: ids.chiliRecipe,
          ingredientId: ids.chicken,
          displayName: "Chicken breast",
          quantity: "500.00",
          unit: "g",
          sortOrder: 0,
        },
        {
          id: ids.chiliBeans,
          recipeId: ids.chiliRecipe,
          ingredientId: ids.beans,
          displayName: "Kidney beans",
          quantity: "400.00",
          unit: "g",
          sortOrder: 1,
        },
        {
          id: ids.riceChicken,
          recipeId: ids.riceRecipe,
          ingredientId: ids.chicken,
          displayName: "Chicken breast",
          quantity: "450.00",
          unit: "g",
          sortOrder: 0,
        },
        {
          id: ids.riceTomatoes,
          recipeId: ids.riceRecipe,
          ingredientId: ids.tomatoes,
          displayName: "Chopped tomatoes",
          quantity: "400.00",
          unit: "g",
          sortOrder: 1,
        },
      ] satisfies (typeof recipeIngredients.$inferInsert)[];

      for (const recipeIngredient of recipeIngredientsToSeed) {
        await tx
          .insert(recipeIngredients)
          .values(recipeIngredient)
          .onConflictDoUpdate({
            target: recipeIngredients.id,
            set: recipeIngredient,
          });
      }

      const now = new Date();
      const inventoryToSeed = [
        {
          id: ids.chiliBatch,
          userId,
          name: "Chicken and bean chili",
          itemType: "meal_prep",
          recipeId: ids.chiliRecipe,
          storageLocation: "freezer",
          initialQuantity: "4.00",
          remainingQuantity: "3.00",
          unit: "portion",
          preparedAt: new Date(now.getTime() - 86_400_000),
          expiresAt: new Date(now.getTime() + 30 * 86_400_000),
          caloriesPerUnit: "390.00",
          proteinPerUnit: "42.00",
          carbsPerUnit: "34.00",
          fatPerUnit: "9.00",
          costPerUnit: "620.00",
          currency: "HUF",
        },
        {
          id: ids.riceBatch,
          userId,
          name: "Tomato chicken rice bowls",
          itemType: "meal_prep",
          recipeId: ids.riceRecipe,
          storageLocation: "fridge",
          initialQuantity: "3.00",
          remainingQuantity: "2.00",
          unit: "portion",
          preparedAt: now,
          expiresAt: new Date(now.getTime() + 4 * 86_400_000),
          caloriesPerUnit: "510.00",
          proteinPerUnit: "38.00",
          carbsPerUnit: "64.00",
          fatPerUnit: "8.00",
          costPerUnit: "710.00",
          currency: "HUF",
        },
        {
          id: ids.chickenPack,
          userId,
          name: "Fresh chicken breast",
          itemType: "ingredient",
          ingredientId: ids.chicken,
          storageLocation: "fridge",
          initialQuantity: "5.00",
          remainingQuantity: "2.50",
          unit: "100 g",
          preparedAt: null,
          expiresAt: new Date(now.getTime() + 86_400_000),
          caloriesPerUnit: "120.00",
          proteinPerUnit: "22.50",
          carbsPerUnit: "0.00",
          fatPerUnit: "2.60",
          costPerUnit: "259.80",
          currency: "HUF",
        },
        {
          id: ids.mozzarellaPack,
          userId,
          name: "Mozzarella",
          itemType: "packaged",
          ingredientId: ids.mozzarella,
          storageLocation: "fridge",
          initialQuantity: "1.00",
          remainingQuantity: "1.00",
          unit: "pack",
          preparedAt: null,
          expiresAt: new Date(now.getTime() + 7 * 86_400_000),
          caloriesPerUnit: "350.00",
          proteinPerUnit: "35.00",
          carbsPerUnit: "2.75",
          fatPerUnit: "21.25",
          costPerUnit: "899.00",
          currency: "HUF",
        },
      ] satisfies (typeof inventoryItems.$inferInsert)[];

      for (const item of inventoryToSeed) {
        await tx
          .insert(inventoryItems)
          .values(item)
          .onConflictDoUpdate({ target: inventoryItems.id, set: item });
      }

      await tx
        .insert(mealLogs)
        .values({
          id: ids.mealLog,
          userId,
          inventoryItemId: ids.chiliBatch,
          recipeId: ids.chiliRecipe,
          name: "Chicken and bean chili",
          mealType: "dinner",
          quantity: "1.00",
          unit: "portion",
          calories: "390.00",
          proteinG: "42.00",
          carbsG: "34.00",
          fatG: "9.00",
          costAmount: "620.00",
          currency: "HUF",
        })
        .onConflictDoUpdate({
          target: mealLogs.id,
          set: {
            inventoryItemId: ids.chiliBatch,
            recipeId: ids.chiliRecipe,
            name: "Chicken and bean chili",
            mealType: "dinner",
            quantity: "1.00",
            unit: "portion",
            calories: "390.00",
            proteinG: "42.00",
            carbsG: "34.00",
            fatG: "9.00",
            costAmount: "620.00",
            currency: "HUF",
          },
        });

      await tx
        .insert(conversations)
        .values({ id: ids.conversation, userId, title: "Meal prep ideas" })
        .onConflictDoUpdate({
          target: conversations.id,
          set: { title: "Meal prep ideas", updatedAt: new Date() },
        });

      const itemsToSeed = [
        {
          id: ids.message,
          conversationId: ids.conversation,
          sequence: 1,
          type: "message",
          role: "user",
          payload: { kind: "message", text: "What can I cook with chicken and beans?" },
        },
        {
          id: ids.toolCall,
          conversationId: ids.conversation,
          sequence: 2,
          type: "tool_call",
          role: "assistant",
          callId: "seed-call-1",
          toolName: "search_recipes",
          payload: {
            kind: "tool_call",
            arguments: { ingredients: ["chicken", "beans"] },
          },
        },
        {
          id: ids.toolResult,
          conversationId: ids.conversation,
          sequence: 3,
          type: "tool_result",
          role: "tool",
          callId: "seed-call-1",
          toolName: "search_recipes",
          payload: {
            kind: "tool_result",
            result: { recipeIds: [ids.chiliRecipe], count: 1 },
          },
        },
      ] satisfies (typeof conversationItems.$inferInsert)[];

      for (const item of itemsToSeed) {
        await tx
          .insert(conversationItems)
          .values(item)
          .onConflictDoUpdate({
            target: conversationItems.id,
            set: item,
          });
      }
    });

    console.info("Database seed completed.");
  } finally {
    await closeDatabase();
  }
}

await seed();
