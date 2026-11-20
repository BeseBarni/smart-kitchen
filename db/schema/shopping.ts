import { numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./users";

export const shoppingItems = pgTable("shopping_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  unit: text("unit").notNull(),
  unitKey: text("unit_key").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("shopping_items_user_name_unit_idx").on(table.userId, table.nameKey, table.unitKey),
]);
