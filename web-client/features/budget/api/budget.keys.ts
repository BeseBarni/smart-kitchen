export const budgetKeys = {
  all: ["budget"] as const,
  categories: () => [...budgetKeys.all, "categories"] as const,
  merchants: (params?: { q?: string; sort?: "recommended" | "name"; limit?: number }) =>
    [...budgetKeys.all, "merchants", params ?? {}] as const,
  summary: (yearMonth: string) => [...budgetKeys.all, "summary", yearMonth] as const,
  receipts: (filters?: { yearMonth?: string; merchantId?: string; categoryId?: string }) =>
    [...budgetKeys.all, "receipts", filters ?? {}] as const,
  receiptDetail: (id: string) => [...budgetKeys.all, "receipt-detail", id] as const,
};
