import { z } from "zod";

const currencyAmountSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().nonnegative(),
}).strict().describe("Amount grouped by currency.");

export const upsertMonthlyBudgetInputSchema = z.object({
  totalLimitAmount: z.number().finite().nonnegative().describe("Monthly spending limit."),
  currency: z.string().regex(/^[A-Z]{3}$/).describe("Budget currency."),
  categoryLimits: z.array(z.object({
    categoryId: z.string().uuid().describe("Limited category."),
    limitAmount: z.number().finite().nonnegative().describe("Category spending limit."),
  }).strict()).max(100).describe("Normalized per-category limits."),
}).strict()
  .refine((value) => new Set(value.categoryLimits.map((limit) => limit.categoryId)).size === value.categoryLimits.length,
    "A category may only have one limit.")
  .describe("Input for setting a monthly budget.");

export const budgetSummaryQuerySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).describe("UTC budget month."),
  from: z.iso.datetime().optional().describe("Optional inclusive UTC start timestamp."),
  to: z.iso.datetime().optional().describe("Optional exclusive UTC end timestamp."),
}).strict().refine(
  ({ from, to }) => !from || !to || Date.parse(from) < Date.parse(to),
  "The from timestamp must be earlier than to.",
).describe("Monthly budget summary filters.");

export const monthlyBudgetSummaryDtoSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  budget: z.object({
    id: z.string().uuid(),
    yearMonth: z.string(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    totalLimitAmount: z.number().nonnegative(),
  }).strict().nullable(),
  isInherited: z.boolean(),
  totalSpent: z.number().nonnegative().nullable().describe("Spend matching the budget currency, if set."),
  spendByCurrency: z.array(currencyAmountSchema),
  receiptCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  dailyAverageSpend: z.number().nonnegative().nullable(),
  projectedMonthSpend: z.number().nonnegative().nullable(),
  remainingAmount: z.number().nullable(),
  status: z.enum(["on_track", "near_limit", "over_budget", "unset"]),
  pacing: z.object({
    elapsedDays: z.number().int().nonnegative(),
    daysInMonth: z.number().int().positive(),
    nearLimitPercent: z.literal(80),
  }).strict(),
  categoryBreakdown: z.array(z.object({
    categoryId: z.string().uuid(),
    slug: z.string(),
    label: z.string(),
    i18nKey: z.string().nullable(),
    iconName: z.string().nullable(),
    colorToken: z.string().nullable(),
    spentAmount: z.number().nonnegative().describe("Spend matching the budget currency."),
    spentByCurrency: z.array(currencyAmountSchema),
    percentage: z.number().nonnegative().nullable(),
    itemCount: z.number().int().nonnegative(),
    limitAmount: z.number().nonnegative().nullable(),
  }).strict()),
  merchantBreakdown: z.array(z.object({
    merchantId: z.string().uuid(),
    name: z.string(),
    spentAmount: z.number().nonnegative().describe("Spend matching the budget currency."),
    spentByCurrency: z.array(currencyAmountSchema),
    receiptCount: z.number().int().nonnegative(),
  }).strict()),
}).strict().describe("Monthly budget and currency-aware spending summary.");

export type UpsertMonthlyBudgetInput = z.infer<typeof upsertMonthlyBudgetInputSchema>;
export type BudgetSummaryQuery = z.infer<typeof budgetSummaryQuerySchema>;
export type MonthlyBudgetSummaryDto = z.infer<typeof monthlyBudgetSummaryDtoSchema>;
