import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./users";

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    i18nKey: text("i18n_key"),
    iconName: text("icon_name"),
    colorToken: text("color_token"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("expense_categories_global_slug_uidx")
      .on(table.slug)
      .where(sql`${table.userId} is null`),
    uniqueIndex("expense_categories_user_slug_uidx")
      .on(table.userId, table.slug)
      .where(sql`${table.userId} is not null`),
    index("expense_categories_user_sort_idx").on(table.userId, table.sortOrder),
  ],
);
