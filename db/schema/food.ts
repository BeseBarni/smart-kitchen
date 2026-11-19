import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./users";
import { baseUnitEnum, recipeSourceEnum } from "./enums";

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category"),
    imageUrl: text("image_url"),
    defaultUnit: baseUnitEnum("default_unit").default("g").notNull(),
    baseQuantity: numeric("base_quantity", { precision: 10, scale: 2 }).default("100.00").notNull(),
    calories: numeric("calories", { precision: 10, scale: 2 }),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 }),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 }),
    fatG: numeric("fat_g", { precision: 10, scale: 2 }),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    priceAmount: numeric("price_amount", { precision: 10, scale: 2 }),
    priceQuantity: numeric("price_quantity", { precision: 10, scale: 2 }),
    priceUnit: text("price_unit"),
    currency: text("currency").default("HUF").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ingredients_user_id_name_idx").on(table.userId, table.name)],
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    instructions: jsonb("instructions").$type<string[]>().default([]).notNull(),
    imageUrl: text("image_url"),
    prepTimeMin: integer("prep_time_min"),
    cookTimeMin: integer("cook_time_min"),
    servings: numeric("servings", { precision: 10, scale: 2 }).notNull(),
    isFreezerFriendly: boolean("is_freezer_friendly").default(false).notNull(),
    source: recipeSourceEnum("source").default("manual").notNull(),
    caloriesPerServing: numeric("calories_per_serving", { precision: 10, scale: 2 }),
    proteinPerServing: numeric("protein_per_serving", { precision: 10, scale: 2 }),
    carbsPerServing: numeric("carbs_per_serving", { precision: 10, scale: 2 }),
    fatPerServing: numeric("fat_per_serving", { precision: 10, scale: 2 }),
    costPerServing: numeric("cost_per_serving", { precision: 10, scale: 2 }),
    currency: text("currency").default("HUF").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("recipes_user_id_created_at_idx").on(table.userId, table.createdAt)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").notNull(),
    notes: text("notes"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [index("recipe_ingredients_recipe_id_idx").on(table.recipeId)],
);
