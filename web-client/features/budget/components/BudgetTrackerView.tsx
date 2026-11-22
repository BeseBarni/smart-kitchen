"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { useBudgetOverview } from "../hooks/use-budget-overview";
import { useReceiptDetail } from "../hooks/use-receipt-detail";
import { MonthSwitcher } from "./MonthSwitcher";
import { BudgetHeroCard } from "./BudgetHeroCard";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";
import { MerchantFilterStrip } from "./MerchantFilterStrip";
import { DualQuickAddStrip } from "./DualQuickAddStrip";
import { ReceiptFeedList } from "./ReceiptFeedList";
import { ReceiptDetailSheet } from "./ReceiptDetailSheet";
import { ReceiptFormSheet } from "./ReceiptFormSheet";
import { BudgetSettingsSheet } from "./BudgetSettingsSheet";
import { DeleteReceiptDialog } from "./DeleteReceiptDialog";

export function BudgetTrackerView(): React.JSX.Element {
  const { t } = useText();
  const ui = useBudgetUiStore();
  const overview = useBudgetOverview();
  const editDetail = useReceiptDetail(ui.editingReceiptId);
  const pending = overview.summary.isPending || overview.receipts.isPending || overview.categories.isPending;
  const error = overview.summary.isError || overview.receipts.isError || overview.categories.isError;
  if (pending) return <div role="status" aria-label={t("budget.loading")} className="space-y-3 pb-24">
    <Skeleton className="h-12" /><Skeleton className="h-48" /><Skeleton className="h-36" /><Skeleton className="h-64" />
  </div>;
  if (error) return <div role="alert" className="space-y-3 rounded-xl border border-outline-variant p-4">
    <p>{t("budget.loadError")}</p>
    <Button type="button" onClick={() => { void overview.summary.refetch(); void overview.receipts.refetch(); void overview.categories.refetch(); }}>{t("common.retry")}</Button>
  </div>;
  const summary = overview.summary.data;
  if (!summary) return <></>;
  const receipts = overview.receipts.data ?? [];
  const hasFilters = Boolean(ui.selectedCategoryId || ui.selectedMerchantId);
  return <div className="space-y-3 pb-24">
    <header><p className="text-label-sm uppercase text-primary">{t("budget.subtitle")}</p><h1 className="text-headline-lg">{t("budget.title")}</h1></header>
    <MonthSwitcher yearMonth={ui.selectedYearMonth} onPrevious={ui.prevMonth} onNext={ui.nextMonth} onCurrent={ui.goToCurrentMonth} />
    <BudgetHeroCard summary={summary} yearMonth={ui.selectedYearMonth} onEdit={() => ui.openSheet("budget-settings")} />
    <DualQuickAddStrip onScan={() => ui.openSheet("create-scanned")} onManual={() => ui.openSheet("create-manual")} />
    <CategoryBreakdownCard summary={summary} selectedId={ui.selectedCategoryId} onSelect={ui.toggleCategory} />
    <MerchantFilterStrip summary={summary} selectedId={ui.selectedMerchantId}
      hasCategoryFilter={Boolean(ui.selectedCategoryId)}
      onSelect={ui.toggleMerchant} onClear={ui.clearFilters} />
    {receipts.length === 0
      ? <div className="rounded-xl border border-outline-variant p-5 text-center">
          <p className="text-body-md">{hasFilters ? t("budget.emptyFilters") : t("budget.emptyMonth")}</p>
          {hasFilters ? <Button type="button" variant="outline" className="mt-3" onClick={ui.clearFilters}>{t("budget.clearFilters")}</Button>
            : <Button type="button" className="mt-3" onClick={() => ui.openSheet(summary.budget ? "create-manual" : "budget-settings")}>{summary.budget ? t("budget.addExpense") : t("budget.setBudget")}</Button>}
        </div>
      : <ReceiptFeedList receipts={receipts} onOpen={ui.openReceipt} />}
    {ui.selectedReceiptId && <ReceiptDetailSheet />}
    {(ui.activeSheet === "create-manual" || ui.activeSheet === "create-scanned") && <ReceiptFormSheet />}
    {ui.activeSheet === "edit-receipt" && <ReceiptFormSheet detail={editDetail.data} />}
    {ui.activeSheet === "budget-settings" && <BudgetSettingsSheet summary={summary} />}
    <DeleteReceiptDialog />
  </div>;
}
