import { z } from "zod";

export const expenseCategoryDtoSchema = z.object({
  id: z.string().uuid().describe("Expense category identifier."),
  userId: z.string().uuid().nullable().describe("Owner ID, or null for a canonical category."),
  slug: z.string().describe("Stable category key."),
  label: z.string().describe("Category display label."),
  i18nKey: z.string().nullable().describe("Optional translation key."),
  iconName: z.string().nullable().describe("Optional icon identifier."),
  colorToken: z.string().nullable().describe("Optional design-system color token."),
  sortOrder: z.number().int().describe("Display ordering."),
  createdAt: z.iso.datetime().describe("Creation timestamp."),
  updatedAt: z.iso.datetime().describe("Last update timestamp."),
}).strict().describe("An available spending category.");

export const createExpenseCategoryInputSchema = z.object({
  slug: z.string().trim().min(1).max(64).describe("Stable category key."),
  label: z.string().trim().min(1).max(100).describe("Category display label."),
  i18nKey: z.string().trim().max(120).nullable().optional().describe("Optional translation key."),
  iconName: z.string().trim().max(80).nullable().optional().describe("Optional icon identifier."),
  colorToken: z.string().trim().max(80).nullable().optional().describe("Optional color token."),
  sortOrder: z.number().int().optional().describe("Optional display order."),
}).strict().describe("Input for creating a custom spending category.");

export type ExpenseCategoryDto = z.infer<typeof expenseCategoryDtoSchema>;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategoryInputSchema>;
