import { Sparkles, Coffee, CookingPot, Package } from "lucide-react";
import type { MonthlyBudgetSummaryDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";

function categoryIcon(slug: string): React.JSX.Element {
  if (slug.includes("house")) return <Sparkles size={18} />;
  if (slug.includes("dining") || slug.includes("entertain")) return <Coffee size={18} />;
  if (slug.includes("misc") || slug.includes("other")) return <Package size={18} />;
  return <CookingPot size={18} />;
}

export function CategoryBreakdownCard({ summary, selectedId, onSelect }: {
  summary: MonthlyBudgetSummaryDto;
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const { t, formatCurrency } = useText();
  const currency = summary.budget?.currency ?? summary.spendByCurrency[0]?.currency ?? "HUF";
  return <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
    <div><h2 className="text-title-sm">{t("budget.spendingByCategory")}</h2><p className="text-label-md text-muted-foreground">{t("budget.allActive")}</p></div>
    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-container">
      {summary.categoryBreakdown.map((category) => <button type="button" key={category.categoryId} aria-label={category.label}
        className={category.categoryId === selectedId ? "bg-primary" : "bg-secondary"}
        style={{ width: `${category.percentage ?? 0}%` }} onClick={() => onSelect(category.categoryId)} />)}
    </div>
    <div className="mt-3 space-y-1">
      {summary.categoryBreakdown.map((category) => <button type="button" key={category.categoryId}
        onClick={() => onSelect(category.categoryId)}
        className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left ${category.categoryId === selectedId ? "bg-secondary-container" : ""}`}>
        <span className="flex size-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">{categoryIcon(category.slug)}</span>
        <span className="min-w-0 flex-1"><strong className="block truncate text-body-md">{category.i18nKey?.startsWith("budget.") ? t(category.i18nKey as "budget.categories.food") : category.label}</strong><span className="text-label-md text-muted-foreground">{category.percentage ?? 0}% • {category.itemCount} items</span></span>
        <strong className="tabular-nums">{formatCurrency(category.spentAmount, currency)}</strong>
      </button>)}
    </div>
  </section>;
}
