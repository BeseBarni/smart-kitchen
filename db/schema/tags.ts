import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "./users";
import { ingredients, recipes } from "./food";
import { inventoryItems } from "./inventory";

export const tagCategoryEnum = pgEnum("tag_category", [
  "dietary",
  "nutrition",
  "prep",
  "flavor",
  "custom",
]);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    i18nKey: text("i18n_key"),
    category: tagCategoryEnum("category").notNull(),
    colorToken: text("color_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tags_global_slug_uidx")
      .on(table.slug)
      .where(sql`${table.userId} is null`),
    uniqueIndex("tags_user_slug_uidx")
      .on(table.userId, table.slug)
      .where(sql`${table.userId} is not null`),
    index("tags_category_slug_idx").on(table.category, table.slug),
  ],
);

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.tagId] })],
);

export const ingredientTags = pgTable(
  "ingredient_tags",
  {
    ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.ingredientId, table.tagId] })],
);

export const inventoryItemTags = pgTable(
  "inventory_item_tags",
  {
    inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.inventoryItemId, table.tagId] })],
);
