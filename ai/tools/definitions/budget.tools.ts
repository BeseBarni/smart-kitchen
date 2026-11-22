import { z } from "zod";
import {
  budgetService,
  expenseCategoriesService,
  merchantService,
  receiptReadService,
  receiptWriteService,
} from "@app/modules";
import { commitScannedReceiptInputSchema } from "@app/modules/schemas";
import { defineTool, toolError } from "./tool.types";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional().describe("UTC month in YYYY-MM format; defaults to the current month.");

export const budgetGetMonthlySummaryTool = defineTool({
  name: "budget_get_monthly_summary",
  description: "Read monthly spending, budget remaining amount, pacing, category, and merchant summaries.",
  inputSchema: z.object({ yearMonth: yearMonthSchema }).strict(),
  outputSchema: z.unknown(),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async ({ yearMonth }, context) =>
    budgetService.getMonthlySummary(context.userId, { yearMonth: yearMonth ?? currentYearMonth() }),
});

export const budgetListReceiptsTool = defineTool({
  name: "budget_list_receipts",
  description: "List receipt summaries filtered by month, date, merchant, category, or search text.",
  inputSchema: z.object({
    yearMonth: yearMonthSchema,
    from: z.iso.datetime().optional().describe("Inclusive UTC start."),
    to: z.iso.datetime().optional().describe("Exclusive UTC end."),
    merchantName: z.string().trim().min(1).max(120).optional().describe("Merchant display name."),
    categorySlug: z.string().trim().min(1).max(80).optional().describe("Expense category slug."),
    search: z.string().trim().max(120).optional(),
    limit: z.number().int().positive().max(100).optional().default(50),
  }).strict(),
  outputSchema: z.unknown(),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async (input, context) => {
    let merchantId: string | undefined;
    if (input.merchantName) {
      const merchants = await merchantService.list(context.userId, { q: input.merchantName, sort: "recommended", limit: 50 });
      if (!merchants.success) return merchants;
      merchantId = merchants.data.find((merchant) =>
        merchant.name.toLowerCase() === input.merchantName!.toLowerCase())?.id;
    }
    let categoryId: string | undefined;
    if (input.categorySlug) {
      const categories = await expenseCategoriesService.listAvailable(context.userId);
      if (!categories.success) return categories;
      categoryId = categories.data.find((category) => category.slug === input.categorySlug)?.id;
    }
    return receiptReadService.list(context.userId, {
      yearMonth: input.yearMonth,
      from: input.from,
      to: input.to,
      merchantId,
      categoryId,
      search: input.search,
      limit: input.limit,
      offset: 0,
    });
  },
});

export const budgetGetReceiptDetailTool = defineTool({
  name: "budget_get_receipt_detail",
  description: "Read the itemized breakdown for one receipt.",
  inputSchema: z.object({ receiptId: z.string().uuid().describe("Receipt identifier.") }).strict(),
  outputSchema: z.unknown(),
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: async ({ receiptId }, context) => receiptReadService.getReceiptDetail(context.userId, receiptId),
});

export const budgetLogExpenseTool = defineTool({
  name: "budget_log_expense",
  description: "Log a manual expense as a 3NF receipt and categorized line items.",
  inputSchema: z.object({
    merchantName: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().max(160).optional(),
    purchasedAt: z.iso.datetime().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional().default("HUF"),
    items: z.array(z.object({
      name: z.string().trim().min(1).max(200),
      categorySlug: z.string().trim().min(1).max(80),
      amount: z.number().finite().nonnegative(),
      quantity: z.number().finite().positive().optional(),
      unit: z.string().trim().min(1).max(32).optional(),
    }).strict()).min(1).max(200),
  }).strict(),
  outputSchema: z.unknown(),
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["budget", "receipts", "merchants"],
  execute: async (input, context) => {
    const categories = await expenseCategoriesService.listAvailable(context.userId);
    if (!categories.success) return categories;
    const fallback = categories.data.find((category) => category.slug === "other") ?? categories.data[0];
    const items = input.items.map((item) => ({
      name: item.name,
      categoryId: categories.data.find((category) => category.slug === item.categorySlug)?.id ?? fallback?.id ?? "",
      amount: item.amount,
      quantity: item.quantity,
      unit: item.unit,
    }));
    if (items.some((item) => !item.categoryId)) {
      return toolError({ code: "VALIDATION_ERROR", message: "No category is available." });
    }
    return receiptWriteService.create(context.userId, {
      ...(input.merchantName ? { merchantName: input.merchantName } : {}),
      source: "manual",
      purchasedAt: input.purchasedAt ?? new Date().toISOString(),
      currency: input.currency,
      title: input.title ?? null,
      items,
    });
  },
});

export const budgetUpdateMonthlyLimitTool = defineTool({
  name: "budget_update_monthly_limit",
  description: "Create or replace the monthly budget limit and optional category limits.",
  inputSchema: z.object({
    yearMonth: yearMonthSchema,
    totalLimitAmount: z.number().finite().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional().default("HUF"),
    categoryLimits: z.array(z.object({
      categoryId: z.string().uuid(),
      limitAmount: z.number().finite().nonnegative(),
    }).strict()).max(100).optional(),
  }).strict(),
  outputSchema: z.unknown(),
  annotations: { destructiveHint: false, idempotentHint: true },
  invalidateDomains: ["budget"],
  execute: async (input, context) =>
    budgetService.upsertMonthlyBudget(context.userId, input.yearMonth ?? currentYearMonth(), {
      totalLimitAmount: input.totalLimitAmount,
      currency: input.currency,
      categoryLimits: input.categoryLimits ?? [],
    }),
});

export const budgetCommitScannedReceiptTool = defineTool({
  name: "budget_commit_scanned_receipt",
  description: "Commit an already reviewed scanned receipt and optional inventory stocks in one transaction.",
  inputSchema: commitScannedReceiptInputSchema,
  outputSchema: z.unknown(),
  annotations: { destructiveHint: false, idempotentHint: false },
  invalidateDomains: ["budget", "receipts", "merchants", "inventory"],
  execute: async (input, context) => receiptWriteService.commitScannedReceipt(context.userId, input),
});

export const budgetTools = [
  budgetGetMonthlySummaryTool,
  budgetListReceiptsTool,
  budgetGetReceiptDetailTool,
  budgetLogExpenseTool,
  budgetUpdateMonthlyLimitTool,
  budgetCommitScannedReceiptTool,
] as const;
