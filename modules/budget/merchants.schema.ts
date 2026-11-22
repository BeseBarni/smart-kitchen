import { z } from "zod";

export const merchantDtoSchema = z.object({
  id: z.string().uuid().describe("Merchant identifier."),
  userId: z.string().uuid().describe("Owner ID."),
  name: z.string().describe("Display name."),
  defaultCategoryId: z.string().uuid().nullable().describe("Optional suggested category."),
  receiptCount: z.number().int().nonnegative().describe("Computed receipt count."),
  lastPurchasedAt: z.iso.datetime().nullable().describe("Most recent receipt timestamp."),
  createdAt: z.iso.datetime().describe("Creation timestamp."),
  updatedAt: z.iso.datetime().describe("Last update timestamp."),
}).strict().describe("A merchant with computed recommendation statistics.");

export const merchantSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  defaultCategoryId: z.string().uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict().describe("A merchant linked to a receipt.");

export const createMerchantInputSchema = z.object({
  name: z.string().trim().min(1).max(120).describe("Merchant display name."),
  defaultCategoryId: z.string().uuid().nullable().optional().describe("Optional suggested category."),
}).strict().describe("Input for creating a merchant.");

export const updateMerchantInputSchema = createMerchantInputSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.")
  .describe("Input for updating a merchant.");

export const listMerchantsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().describe("Optional name search."),
  sort: z.enum(["recommended", "name"]).default("recommended").describe("Merchant ordering."),
  limit: z.coerce.number().int().positive().max(50).default(20).describe("Maximum merchants."),
}).strict().describe("Merchant listing filters.");

export type MerchantDto = z.infer<typeof merchantDtoSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantInputSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantInputSchema>;
export type ListMerchantsQuery = z.infer<typeof listMerchantsQuerySchema>;
