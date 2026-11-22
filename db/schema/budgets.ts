import { sql } from "drizzle-orm";
import {
  check,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./users";
import { expenseCategories } from "./expense-categories";

export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    totalLimitAmount: numeric("total_limit_amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("monthly_budgets_year_month_check", sql`${table.yearMonth} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`),
    check("monthly_budgets_limit_nonnegative_check", sql`${table.totalLimitAmount} >= 0`),
    uniqueIndex("monthly_budgets_user_year_month_uidx").on(table.userId, table.yearMonth),
  ],
);

export const monthlyBudgetCategoryLimits = pgTable(
  "monthly_budget_category_limits",
  {
    monthlyBudgetId: uuid("monthly_budget_id")
      .notNull()
      .references(() => monthlyBudgets.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => expenseCategories.id, {
      onDelete: "cascade",
    }),
    limitAmount: numeric("limit_amount", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.monthlyBudgetId, table.categoryId] }),
    check("monthly_budget_category_limits_nonnegative_check", sql`${table.limitAmount} >= 0`),
  ],
);
