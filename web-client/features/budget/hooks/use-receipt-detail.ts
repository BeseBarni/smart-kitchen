import { useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetApi } from "../api/budget.api";
import { budgetKeys } from "../api/budget.keys";
import type { ReceiptDetailDto } from "@app/modules/schemas";

export function useReceiptDetail(id: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: budgetKeys.receiptDetail(id ?? "none"),
    enabled: Boolean(id),
    placeholderData: id
      ? () => client.getQueryData<ReceiptDetailDto>(budgetKeys.receiptDetail(id))
      : undefined,
    queryFn: () => budgetApi.receiptDetail(id as string),
  });
}
