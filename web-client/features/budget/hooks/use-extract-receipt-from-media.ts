import { useMutation } from "@tanstack/react-query";
import type { ExtractedReceiptPreviewDto } from "@app/modules/schemas";
import { budgetApi } from "../api/budget.api";

export function useExtractReceiptFromMedia() {
  return useMutation({
    mutationKey: ["budget", "receipts", "extract"],
    mutationFn: async (mediaAssetId: string): Promise<ExtractedReceiptPreviewDto> => {
      return budgetApi.extractReceiptFromMedia({
        mediaAssetId,
        userLocale: undefined,
      });
    },
  });
}
