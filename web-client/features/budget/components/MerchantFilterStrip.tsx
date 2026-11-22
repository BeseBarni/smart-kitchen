import type { MonthlyBudgetSummaryDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";

export function MerchantFilterStrip({ summary, selectedId, onSelect, onClear, hasCategoryFilter }: {
  summary: MonthlyBudgetSummaryDto;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  hasCategoryFilter: boolean;
}): React.JSX.Element {
  const { t } = useText();
  if (summary.merchantBreakdown.length === 0 && !hasCategoryFilter) return <></>;
  return <div className="flex gap-2 overflow-x-auto pb-1">
    <button type="button" className={`min-h-11 shrink-0 rounded-full px-3 ${selectedId ? "border border-outline-variant bg-surface-container-lowest" : "bg-on-surface text-on-primary"}`} onClick={() => onClear()}>{t("budget.allStores")}</button>
    {summary.merchantBreakdown.map((merchant) => <button type="button" key={merchant.merchantId} onClick={() => onSelect(merchant.merchantId)}
      className={`min-h-11 shrink-0 rounded-full px-3 ${selectedId === merchant.merchantId ? "bg-primary text-on-primary" : "border border-outline-variant bg-surface-container-lowest"}`}>
      {merchant.name} • {merchant.receiptCount}
    </button>)}
    {(selectedId || hasCategoryFilter) && <button type="button" className="min-h-11 shrink-0 rounded-full border border-outline-variant px-3" onClick={onClear}>{t("budget.clearFilters")}</button>}
  </div>;
}
