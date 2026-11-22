import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type { ExtractedReceiptPreviewDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { budgetApi } from "../api/budget.api";

export function useExtractReceiptFromMedia(): UseMutationResult<ExtractedReceiptPreviewDto, Error, string> {
  const { locale } = useText();
  return useMutation({
    mutationKey: ["budget", "receipts", "extract"],
    mutationFn: async (mediaAssetId: string): Promise<ExtractedReceiptPreviewDto> => {
      return budgetApi.extractReceiptFromMedia({
        mediaAssetId,
        userLocale: locale,
      });
    },
  });
}
