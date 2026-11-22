import { Sparkles, CookingPot, FileText, Package } from "lucide-react";
import type { ReceiptSummaryDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { isOptimisticId } from "@/lib/optimistic";

function dominantIcon(category: ReceiptSummaryDto["categorySummary"][number] | undefined): React.JSX.Element {
  if (!category) return <FileText size={18} />;
  if (category.category.slug.includes("house")) return <Sparkles size={18} />;
  if (category.category.slug.includes("misc") || category.category.slug.includes("other")) return <Package size={18} />;
  return <CookingPot size={18} />;
}

export function ReceiptRowCard({ receipt, onOpen }: { receipt: ReceiptSummaryDto; onOpen: () => void }): React.JSX.Element {
  const { t, formatCurrency, formatDate } = useText();
  const dominant = receipt.categorySummary[0];
  const title = receipt.title ?? receipt.merchant?.name ?? t("budget.receipt");
  const date = new Date(receipt.purchasedAt);
  return <button type="button" onClick={onOpen} disabled={isOptimisticId(receipt.id)}
    className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-left disabled:opacity-70">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">{dominantIcon(dominant)}</span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-body-md">{title}</strong>
      <span className="block text-label-md text-muted-foreground">{dominant?.category.label ?? t("budget.manual")} • {t("budget.items", { count: receipt.itemCount })}</span>
    </span>
    <span className="text-right"><strong className="block tabular-nums">-{formatCurrency(receipt.totalAmount, receipt.currency)}</strong><span className="text-label-md text-muted-foreground">{formatDate(date, { hour: "2-digit", minute: "2-digit" })}</span></span>
  </button>;
}
