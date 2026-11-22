import {
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "./users";
import {
  inventoryItemTypeEnum,
  inventoryStatusEnum,
  mealTypeEnum,
  storageLocationEnum,
  stockImageKindEnum,
} from "./enums";
import { recipes, ingredients } from "./food";
import { mediaAssets } from "./media";

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    itemType: inventoryItemTypeEnum("item_type").notNull(),
    recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    storageLocation: storageLocationEnum("storage_location").notNull(),
    status: inventoryStatusEnum("status").default("in_stock").notNull(),
    initialQuantity: numeric("initial_quantity", { precision: 10, scale: 2 }).notNull(),
    remainingQuantity: numeric("remaining_quantity", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").default("portion").notNull(),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    imageUrl: text("image_url"),
    imageAssetId: uuid("image_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    stockImageKind: stockImageKindEnum("stock_image_kind"),
    stockImageName: text("stock_image_name"),
    caloriesPerUnit: numeric("calories_per_unit", { precision: 12, scale: 4 }),
    proteinPerUnit: numeric("protein_per_unit", { precision: 12, scale: 4 }),
    carbsPerUnit: numeric("carbs_per_unit", { precision: 12, scale: 4 }),
    fatPerUnit: numeric("fat_per_unit", { precision: 12, scale: 4 }),
    fiberPerUnit: numeric("fiber_per_unit", { precision: 12, scale: 4 }),
    costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 2 }),
    currency: text("currency").default("HUF").notNull(),
    shelfLifeDays: jsonb("shelf_life_days").$type<{
      fridge?: number | null;
      freezer?: number | null;
      pantry?: number | null;
    }>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_items_user_status_location_idx").on(
      table.userId,
      table.status,
      table.storageLocation,
    ),
    index("inventory_items_user_expires_at_idx").on(table.userId, table.expiresAt),
    check(
      "inventory_items_stock_image_pair_check",
      sql`(${table.stockImageKind} is null) = (${table.stockImageName} is null)`,
    ),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, {
      onDelete: "set null",
    }),
    recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    mealType: mealTypeEnum("meal_type"),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").notNull(),
    calories: numeric("calories", { precision: 10, scale: 2 }),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 }),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 }),
    fatG: numeric("fat_g", { precision: 10, scale: 2 }),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    costAmount: numeric("cost_amount", { precision: 10, scale: 2 }),
    currency: text("currency").default("HUF").notNull(),
    eatenAt: timestamp("eaten_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("meal_logs_user_eaten_at_idx").on(table.userId, table.eatenAt)],
);
