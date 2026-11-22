import { useQuery } from "@tanstack/react-query";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { budgetApi } from "../api/budget.api";
import { budgetKeys } from "../api/budget.keys";
import { toLocalMonthRange } from "../utils/budget-date.utils";

export function useBudgetOverview() {
  const ui = useBudgetUiStore();
  const range = toLocalMonthRange(ui.selectedYearMonth);
  const categories = useQuery({ queryKey: budgetKeys.categories(), queryFn: budgetApi.categories });
  const summary = useQuery({
    queryKey: budgetKeys.summary(ui.selectedYearMonth),
    queryFn: () => budgetApi.summary(ui.selectedYearMonth, range),
  });
  const receipts = useQuery({
    queryKey: budgetKeys.receipts({
      yearMonth: ui.selectedYearMonth,
      merchantId: ui.selectedMerchantId ?? undefined,
      categoryId: ui.selectedCategoryId ?? undefined,
    }),
    queryFn: () => budgetApi.receipts({
      yearMonth: ui.selectedYearMonth,
      merchantId: ui.selectedMerchantId ?? undefined,
      categoryId: ui.selectedCategoryId ?? undefined,
      ...range,
      limit: 100,
      offset: 0,
    }),
  });
  return { categories, summary, receipts };
}
