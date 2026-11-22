import { z } from "zod";
import { expenseCategoryDtoSchema } from "./expense-categories.schema";
import { merchantSummaryDtoSchema } from "./merchants.schema";

const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code.");
const receiptItemInputSchema = z.object({
  name: z.string().trim().min(1).max(200).describe("Purchased item name."),
  categoryId: z.string().uuid().describe("Required spending category."),
  amount: z.number().finite().nonnegative().describe("Exact paid line total."),
  quantity: z.number().finite().positive().optional().describe("Purchased quantity."),
  unit: z.string().trim().min(1).max(32).optional().describe("Optional quantity unit."),
  rawReceiptText: z.string().max(500).optional().describe("Optional original receipt text."),
  inventoryItemId: z.string().uuid().nullable().optional().describe("Optional linked inventory record."),
  ingredientId: z.string().uuid().nullable().optional().describe("Optional linked ingredient."),
}).strict().describe("One categorized receipt line.");

const receiptMerchantChoice = z.object({
  merchantId: z.string().uuid().optional().describe("Existing merchant identifier."),
  merchantName: z.string().trim().min(1).max(120).optional().describe("Merchant to resolve or create."),
}).refine(
  ({ merchantId, merchantName }) => Boolean(merchantId) !== Boolean(merchantName),
  "Provide exactly one of merchantId or merchantName.",
);

export const createReceiptInputSchema = receiptMerchantChoice.extend({
  source: z.enum(["scanned", "manual"]).default("manual").describe("Receipt capture source."),
  purchasedAt: z.iso.datetime().describe("Purchase timestamp."),
  currency: currencySchema.describe("Three-letter ISO currency code."),
  title: z.string().trim().max(160).nullable().optional().describe("Optional receipt label."),
  notes: z.string().max(2000).nullable().optional().describe("Optional notes."),
  mediaAssetId: z.string().uuid().nullable().optional().describe("Optional private receipt scan."),
  items: z.array(receiptItemInputSchema).min(1).max(200).describe("Categorized receipt lines."),
}).strict().describe("Input for creating a receipt and its line items.");

export const updateReceiptInputSchema = z.object({
  merchantId: z.string().uuid().nullable().optional().describe("Existing merchant, or null to unlink."),
  merchantName: z.string().trim().min(1).max(120).optional().describe("Merchant to resolve or create."),
  source: z.enum(["scanned", "manual"]).optional().describe("Receipt capture source."),
  purchasedAt: z.iso.datetime().optional().describe("Purchase timestamp."),
  currency: currencySchema.optional().describe("Three-letter ISO currency code."),
  title: z.string().trim().max(160).nullable().optional().describe("Optional receipt label."),
  notes: z.string().max(2000).nullable().optional().describe("Optional notes."),
  mediaAssetId: z.string().uuid().nullable().optional().describe("Private receipt scan, or null to unlink."),
  items: z.array(receiptItemInputSchema).min(1).max(200).optional().describe("Replacement line items."),
}).strict()
  .refine((value) => !(value.merchantId !== undefined && value.merchantName !== undefined),
    "Provide at most one of merchantId or merchantName.")
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.")
  .describe("Input for updating a receipt.");

export const listReceiptsQuerySchema = z.object({
  from: z.iso.datetime().optional().describe("Inclusive UTC start timestamp."),
  to: z.iso.datetime().optional().describe("Exclusive UTC end timestamp."),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().describe("UTC month filter."),
  merchantId: z.string().uuid().optional().describe("Merchant filter."),
  categoryId: z.string().uuid().optional().describe("Line-item category filter."),
  source: z.enum(["scanned", "manual"]).optional().describe("Receipt source filter."),
  search: z.string().trim().max(120).optional().describe("Receipt, merchant, or item search."),
  limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum receipts."),
  offset: z.coerce.number().int().nonnegative().default(0).describe("Receipts to skip."),
}).strict().refine(
  ({ from, to }) => !from || !to || Date.parse(from) <= Date.parse(to),
  "The from timestamp must not be later than to.",
).describe("Receipt listing filters.");

export const receiptItemDtoSchema = z.object({
  id: z.string().uuid(),
  receiptId: z.string().uuid(),
  name: z.string(),
  rawReceiptText: z.string().nullable(),
  category: expenseCategoryDtoSchema,
  quantity: z.number().positive(),
  unit: z.string().nullable(),
  amount: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  inventoryItemId: z.string().uuid().nullable(),
  ingredientId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
}).strict().describe("A receipt line with its derived unit price.");

export const receiptCategorySummaryDtoSchema = z.object({
  category: expenseCategoryDtoSchema,
  amount: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative(),
}).strict();

export const receiptSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  merchant: merchantSummaryDtoSchema.nullable(),
  source: z.enum(["scanned", "manual"]),
  title: z.string().nullable(),
  purchasedAt: z.iso.datetime(),
  currency: currencySchema,
  totalAmount: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  categorySummary: z.array(receiptCategorySummaryDtoSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict().describe("Receipt header with computed totals.");

export const receiptDetailDtoSchema = receiptSummaryDtoSchema.extend({
  mediaAssetId: z.string().uuid().nullable(),
  mediaUrl: z.string().url().nullable(),
  notes: z.string().nullable(),
  items: z.array(receiptItemDtoSchema),
}).strict().describe("Complete receipt detail.");

export type ReceiptItemInput = z.infer<typeof receiptItemInputSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptInputSchema>;
export type UpdateReceiptInput = z.infer<typeof updateReceiptInputSchema>;
export type ListReceiptsQuery = z.infer<typeof listReceiptsQuerySchema>;
export type ReceiptItemDto = z.infer<typeof receiptItemDtoSchema>;
export type ReceiptSummaryDto = z.infer<typeof receiptSummaryDtoSchema>;
export type ReceiptDetailDto = z.infer<typeof receiptDetailDtoSchema>;
