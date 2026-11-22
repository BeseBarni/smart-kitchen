import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db, expenseCategories } from "@app/db";
import { ok, type AppError, type Result } from "@app/shared";
import type { BudgetTransaction } from "./budget.transaction";

export type ExpenseCategoryRow = typeof expenseCategories.$inferSelect;

export async function listAvailable(
  userId: string,
): Promise<Result<ExpenseCategoryRow[], AppError>> {
  const rows = await db.select().from(expenseCategories).where(or(
    isNull(expenseCategories.userId),
    eq(expenseCategories.userId, userId),
  )).orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.label));
  return ok(rows);
}

export async function findAccessibleByIds(
  userId: string,
  categoryIds: string[],
  tx?: BudgetTransaction,
): Promise<Result<ExpenseCategoryRow[], AppError>> {
  if (categoryIds.length === 0) return ok([]);
  const rows = await (tx ?? db).select().from(expenseCategories).where(and(
    inArray(expenseCategories.id, categoryIds),
    or(isNull(expenseCategories.userId), eq(expenseCategories.userId, userId)),
  ));
  return ok(rows);
}
