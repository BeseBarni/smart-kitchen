"use client";

import { useEffect, useState } from "react";
import type { MonthlyBudgetSummaryDto } from "@app/modules/schemas";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { useBudgetMutations } from "../hooks/use-budget-mutations";
import { useBudgetOverview } from "../hooks/use-budget-overview";
import { expenseCategoryLabel } from "../utils/category-label.utils";

export function BudgetSettingsSheet({ summary }: { summary: MonthlyBudgetSummaryDto }): React.JSX.Element {
  const { t, formatCurrency } = useText();
  const ui = useBudgetUiStore();
  const mutations = useBudgetMutations();
  const overview = useBudgetOverview();
  const categories = overview.categories.data ?? [];
  const [limit, setLimit] = useState(summary.budget?.totalLimitAmount ?? 0);
  const [currency, setCurrency] = useState(summary.budget?.currency ?? summary.spendByCurrency[0]?.currency ?? "HUF");
  const [limits, setLimits] = useState<Record<string, number>>({});
  useEffect(() => {
    setLimit(summary.budget?.totalLimitAmount ?? 0);
    setCurrency(summary.budget?.currency ?? summary.spendByCurrency[0]?.currency ?? "HUF");
    setLimits(Object.fromEntries(summary.categoryBreakdown.map((category) => [category.categoryId, category.limitAmount ?? 0])));
  }, [summary]);
  const save = (): void => {
    mutations.upsertBudget.mutate({
      yearMonth: ui.selectedYearMonth,
      input: {
        totalLimitAmount: limit,
        currency,
        categoryLimits: Object.entries(limits).filter(([, amount]) => amount > 0).map(([categoryId, limitAmount]) => ({ categoryId, limitAmount })),
      },
    });
    ui.closeSheet();
  };
  return <Sheet open={ui.activeSheet === "budget-settings"} onOpenChange={(open) => { if (!open) ui.closeSheet(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <SheetTitle className="pr-10">{t("budget.budgetSettings")}</SheetTitle>
      <SheetDescription>{t("budget.budgetDescription")}</SheetDescription>
      <section className="space-y-4">
        <label className="block text-label-md">{t("budget.monthlyLimit")}
          <input type="number" min="0" step="0.01" value={limit} onChange={(event) => setLimit(Number(event.target.value))}
            className="mt-1 h-12 w-full rounded-lg border border-outline-variant px-3 tabular-nums" /></label>
        <label className="block text-label-md">Currency
          <input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="mt-1 h-12 w-full rounded-lg border border-outline-variant px-3 uppercase" /></label>
        <h3 className="text-title-sm">{t("budget.categoryAllocations")}</h3>
        {categories.map((category) => <label key={category.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-outline-variant px-3">
          <span className="text-body-md">{expenseCategoryLabel(category, t)}</span>
          <input type="number" min="0" step="0.01" value={limits[category.id] ?? 0}
            onChange={(event) => setLimits((current) => ({ ...current, [category.id]: Number(event.target.value) }))}
            className="h-11 w-28 rounded-lg border border-outline-variant px-2 text-right tabular-nums" />
        </label>)}
        <div className="flex items-center justify-between rounded-xl bg-secondary-container p-3"><div><strong className="block text-body-md">{t("budget.autoRoll")}</strong><span className="text-label-md text-muted-foreground">{t("budget.autoRollDescription")}</span></div><strong className="tabular-nums">{formatCurrency(limit, currency)}</strong></div>
        <Button type="button" className="h-12 w-full" onClick={save} disabled={mutations.upsertBudget.isPending}>{t("budget.applyBudget")}</Button>
      </section>
    </SheetContent>
  </Sheet>;
}
