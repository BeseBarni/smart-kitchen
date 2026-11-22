import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./users";
import { mediaAssets } from "./media";
import { expenseCategories } from "./expense-categories";
import { merchants } from "./merchants";
import { ingredients } from "./food";
import { inventoryItems } from "./inventory";

export const receiptSourceEnum = pgEnum("receipt_source", ["scanned", "manual"]);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id").references(() => merchants.id, { onDelete: "set null" }),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    source: receiptSourceEnum("source").default("manual").notNull(),
    title: text("title"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    currency: text("currency").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("receipts_user_purchased_at_idx").on(table.userId, table.purchasedAt),
    index("receipts_user_merchant_purchased_at_idx").on(
      table.userId,
      table.merchantId,
      table.purchasedAt,
    ),
    index("receipts_media_asset_id_idx").on(table.mediaAssetId),
  ],
);

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptId: uuid("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => expenseCategories.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    rawReceiptText: text("raw_receipt_text"),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).default("1").notNull(),
    unit: text("unit"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, {
      onDelete: "set null",
    }),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("receipt_items_quantity_positive_check", sql`${table.quantity} > 0`),
    check("receipt_items_amount_nonnegative_check", sql`${table.amount} >= 0`),
    index("receipt_items_receipt_sort_idx").on(table.receiptId, table.sortOrder),
    index("receipt_items_category_idx").on(table.categoryId),
    index("receipt_items_inventory_item_idx").on(table.inventoryItemId),
  ],
);
