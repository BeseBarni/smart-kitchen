import type { MonthlyBudgetSummaryDto } from "@app/modules/schemas";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";

export function BudgetSummaryCard({ summary }: { summary: MonthlyBudgetSummaryDto }) {
  const { t, formatNumber } = useText();
  const limit = summary.budget?.totalLimitAmount ?? null;
  const spent = summary.totalSpent ?? 0;
  const percent = limit && limit > 0 ? Math.min(100, spent / limit * 100) : 0;
  const statusKey = summary.status === "over_budget"
    ? "chat.budgetOver"
    : summary.status === "near_limit"
      ? "chat.budgetNear"
      : "chat.budgetOnTrack";
  return (
    <section aria-label={t("chat.budgetSummary")} className="space-y-3 rounded-xl border border-primary/20 bg-secondary p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-md text-muted-foreground">{summary.yearMonth}</p>
          <h2 className="text-title-sm">{formatNumber(spent)} {summary.budget?.currency ?? ""}</h2>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-label-sm">{t(statusKey)}</span>
      </div>
      {limit !== null ? (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-label-md text-muted-foreground">
            {t("chat.budgetRemaining", { remaining: formatNumber(summary.remainingAmount ?? 0), currency: summary.budget?.currency ?? "" })}
          </p>
        </>
      ) : <p className="text-label-md text-muted-foreground">{t("chat.budgetUnset")}</p>}
      <div className="space-y-2">
        {summary.categoryBreakdown.slice(0, 4).map((category) => (
          <div key={category.categoryId} className="flex items-center justify-between gap-2 text-label-md">
            <span>{category.label}</span>
            <strong className="tabular-nums">{formatNumber(category.spentAmount)}</strong>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="h-11 w-full" onClick={() => { window.location.assign("/budget"); }}>{t("chat.viewBudget")}</Button>
    </section>
  );
}
