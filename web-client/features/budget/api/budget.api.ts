import {
  expenseCategoryDtoSchema,
  merchantDtoSchema,
  merchantSummaryDtoSchema,
  monthlyBudgetSummaryDtoSchema,
  receiptDetailDtoSchema,
  receiptSummaryDtoSchema,
  type CreateMerchantInput,
  type CreateReceiptInput,
  type ExpenseCategoryDto,
  type MerchantDto,
  type MonthlyBudgetSummaryDto,
  type ReceiptDetailDto,
  type ReceiptSummaryDto,
  type UpdateReceiptInput,
  type UpsertMonthlyBudgetInput,
  type ListMerchantsQuery,
  type ListReceiptsQuery,
  type ExtractReceiptFromMediaInput,
  type ExtractedReceiptPreviewDto,
  type CommitScannedReceiptInput,
  type CommitScannedReceiptResultDto,
  extractedReceiptPreviewDtoSchema,
  commitScannedReceiptResultDtoSchema,
} from "@app/modules/schemas";
import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";

export const budgetApi = {
  extractReceiptFromMedia: async (
    input: ExtractReceiptFromMediaInput,
  ): Promise<ExtractedReceiptPreviewDto> =>
    unwrapApiResponse(
      await apiClient.api.receipts["extract-from-media"].$post({ json: input }),
      extractedReceiptPreviewDtoSchema,
    ),
  commitScannedReceipt: async (
    input: CommitScannedReceiptInput,
  ): Promise<CommitScannedReceiptResultDto> =>
    unwrapApiResponse(
      await apiClient.api.receipts["commit-scan"].$post({ json: input }),
      commitScannedReceiptResultDtoSchema,
    ),
  categories: async (): Promise<ExpenseCategoryDto[]> =>
    unwrapApiResponse(await apiClient.api["expense-categories"].$get(), z.array(expenseCategoryDtoSchema)),
  merchants: async (params: ListMerchantsQuery): Promise<MerchantDto[]> =>
    unwrapApiResponse(await apiClient.api.merchants.$get({
      query: { q: params.q, sort: params.sort, limit: String(params.limit) },
    }), z.array(merchantDtoSchema)),
  createMerchant: async (input: CreateMerchantInput): Promise<MerchantDto> =>
    unwrapApiResponse(await apiClient.api.merchants.$post({ json: input }), merchantDtoSchema),
  summary: async (yearMonth: string, range?: { from?: string; to?: string }): Promise<MonthlyBudgetSummaryDto> =>
    unwrapApiResponse(await apiClient.api.budget.summary.$get({
      query: { yearMonth, from: range?.from, to: range?.to },
    }), monthlyBudgetSummaryDtoSchema),
  upsertBudget: async (yearMonth: string, input: UpsertMonthlyBudgetInput): Promise<MonthlyBudgetSummaryDto> =>
    unwrapApiResponse(await apiClient.api.budget[":yearMonth"].$put({
      param: { yearMonth }, json: input,
    }), monthlyBudgetSummaryDtoSchema),
  receipts: async (query: ListReceiptsQuery): Promise<ReceiptSummaryDto[]> =>
    unwrapApiResponse(await apiClient.api.receipts.$get({
      query: {
        yearMonth: query.yearMonth,
        merchantId: query.merchantId,
        categoryId: query.categoryId,
        from: query.from,
        to: query.to,
        source: query.source,
        search: query.search,
        limit: String(query.limit),
        offset: String(query.offset),
      },
    }), z.array(receiptSummaryDtoSchema)),
  receiptDetail: async (id: string): Promise<ReceiptDetailDto> =>
    unwrapApiResponse(await apiClient.api.receipts[":id"].$get({ param: { id } }), receiptDetailDtoSchema),
  createReceipt: async (input: CreateReceiptInput): Promise<ReceiptDetailDto> =>
    unwrapApiResponse(await apiClient.api.receipts.$post({ json: input }), receiptDetailDtoSchema),
  updateReceipt: async (id: string, input: UpdateReceiptInput): Promise<ReceiptDetailDto> =>
    unwrapApiResponse(await apiClient.api.receipts[":id"].$patch({ param: { id }, json: input }), receiptDetailDtoSchema),
  deleteReceipt: async (id: string): Promise<{ deleted: true }> =>
    unwrapApiResponse(await apiClient.api.receipts[":id"].$delete({ param: { id } }), z.object({ deleted: z.literal(true) })),
};
