import { WalletCards } from "lucide-react";
import type { MonthlyBudgetSummaryDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { monthInfo } from "../utils/budget-date.utils";

export function BudgetHeroCard({ summary, yearMonth, onEdit }: {
  summary: MonthlyBudgetSummaryDto;
  yearMonth: string;
  onEdit: () => void;
}): React.JSX.Element {
  const { t, formatCurrency, formatNumber } = useText();
  const limit = summary.budget?.totalLimitAmount ?? null;
  const spent = summary.totalSpent ?? 0;
  const remaining = summary.remainingAmount;
  const pacing = monthInfo(yearMonth);
  const statusKey = summary.status === "near_limit"
    ? "budget.nearLimit"
    : summary.status === "over_budget"
      ? "budget.overBudget"
      : summary.status === "unset"
        ? "budget.unset"
        : "budget.onTrack";
  const currency = summary.budget?.currency ?? summary.spendByCurrency[0]?.currency ?? "HUF";
  const actualPercent = limit ? Math.round((spent / limit) * 100) : 0;
  const targetPercent = Math.round((pacing.currentDay / pacing.daysInMonth) * 100);
  return <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-2"><WalletCards size={20} className="mt-0.5 text-primary" /><h2 className="text-title-sm">{t("budget.monthlyTarget")}</h2></div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary-container px-2 py-1 text-label-sm text-on-secondary-container">{t(statusKey)}</span>
        <button type="button" className="min-h-11 rounded-lg px-2 text-label-md text-primary" onClick={onEdit}>{t("budget.editTarget")}</button>
      </div>
    </div>
    {summary.isInherited && <p className="mt-2 text-label-md text-muted-foreground">{t("budget.inherited")}</p>}
    {limit === null ? <div className="py-5">
      <p className="text-headline-lg tabular-nums">{t("budget.unset")}</p>
      <p className="mt-1 text-body-sm text-muted-foreground">{t("budget.noBudgetHint")}</p>
    </div> : <div className="mt-4">
      <p className="text-label-md text-muted-foreground">{t("budget.spentOf")} {formatCurrency(limit, currency)}</p>
      <div className="mt-1 flex items-end justify-between">
        <strong className="text-display-lg tabular-nums">{formatCurrency(spent, currency)}</strong>
        {remaining !== null && <div className="text-right"><span className="block text-label-md text-muted-foreground">{t("budget.remaining")}</span><strong className="text-title-sm tabular-nums">{formatCurrency(remaining, currency)}</strong></div>}
      </div>
    </div>}
    <div className="relative mt-4 h-3 overflow-visible rounded-full bg-surface-container-high">
      <div className="h-full rounded-full bg-primary" style={{ width: `${limit ? Math.min(actualPercent, 100) : 0}%` }} />
      {limit && <span className="absolute top-[-4px] h-[20px] w-0.5 bg-on-surface" style={{ left: `${Math.min(targetPercent, 100)}%` }} />}
    </div>
    {limit && <p className="mt-2 text-label-md tabular-nums">{t(actualPercent > targetPercent ? "budget.overPace" : "budget.underPace", { percent: formatNumber(Math.abs(actualPercent - targetPercent)) })}</p>}
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant pt-3">
      <div><span className="text-label-md text-muted-foreground">{t("budget.dailyAvg")}</span><strong className="ml-2 tabular-nums">{formatCurrency(summary.dailyAverageSpend ?? 0, currency)}</strong></div>
      <div><span className="text-label-md text-muted-foreground">{t("budget.receipts")}</span><strong className="ml-2 tabular-nums">{formatNumber(summary.receiptCount)}</strong></div>
    </div>
  </section>;
}
