import { and, desc, eq, lt } from "drizzle-orm";
import { db, monthlyBudgetCategoryLimits, monthlyBudgets } from "@app/db";
import { ok, type AppError, type Result } from "@app/shared";
import type { UpsertMonthlyBudgetInput } from "./budget.schema";

export type MonthlyBudgetRow = typeof monthlyBudgets.$inferSelect;
export type MonthlyBudgetLimitRow = typeof monthlyBudgetCategoryLimits.$inferSelect;

export async function findBudgetForMonth(
  userId: string,
  yearMonth: string,
): Promise<Result<{ budget: MonthlyBudgetRow; limits: MonthlyBudgetLimitRow[] } | undefined, AppError>> {
  const [exact] = await db.select().from(monthlyBudgets).where(and(
    eq(monthlyBudgets.userId, userId),
    eq(monthlyBudgets.yearMonth, yearMonth),
  )).limit(1);
  const [budget] = exact
    ? [exact]
    : await db.select().from(monthlyBudgets).where(and(
      eq(monthlyBudgets.userId, userId),
      lt(monthlyBudgets.yearMonth, yearMonth),
    )).orderBy(desc(monthlyBudgets.yearMonth)).limit(1);
  if (!budget) return ok(undefined);
  const limits = await db.select().from(monthlyBudgetCategoryLimits)
    .where(eq(monthlyBudgetCategoryLimits.monthlyBudgetId, budget.id));
  return ok({ budget, limits });
}

export async function upsertBudget(
  userId: string,
  yearMonth: string,
  input: UpsertMonthlyBudgetInput,
): Promise<Result<MonthlyBudgetRow, AppError>> {
  const row = await db.transaction(async (tx) => {
    const [saved] = await tx.insert(monthlyBudgets).values({
      userId,
      yearMonth,
      totalLimitAmount: input.totalLimitAmount.toFixed(2),
      currency: input.currency,
    }).onConflictDoUpdate({
      target: [monthlyBudgets.userId, monthlyBudgets.yearMonth],
      set: {
        totalLimitAmount: input.totalLimitAmount.toFixed(2),
        currency: input.currency,
        updatedAt: new Date(),
      },
    }).returning();
    if (!saved) throw new Error("Budget upsert returned no row.");
    await tx.delete(monthlyBudgetCategoryLimits)
      .where(eq(monthlyBudgetCategoryLimits.monthlyBudgetId, saved.id));
    if (input.categoryLimits.length > 0) {
      await tx.insert(monthlyBudgetCategoryLimits).values(input.categoryLimits.map((limit) => ({
        monthlyBudgetId: saved.id,
        categoryId: limit.categoryId,
        limitAmount: limit.limitAmount.toFixed(2),
      })));
    }
    return saved;
  });
  return ok(row);
}

