import type { ReceiptSummaryDto } from "@app/modules/schemas";
import { useText } from "@/lib/i18n";
import { receiptDateGroup } from "../utils/budget-date.utils";
import { ReceiptRowCard } from "./ReceiptRowCard";

export function ReceiptFeedList({ receipts, onOpen }: { receipts: ReceiptSummaryDto[]; onOpen: (id: string) => void }): React.JSX.Element {
  const { locale, t } = useText();
  const groups = new Map<string, ReceiptSummaryDto[]>();
  for (const receipt of receipts) {
    const group = receiptDateGroup(receipt.purchasedAt, locale, t("budget.today"), t("budget.yesterday"));
    groups.set(group, [...(groups.get(group) ?? []), receipt]);
  }
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><h2 className="text-title-sm">{t("budget.recentExpenses")}</h2><span className="text-label-md text-muted-foreground">{t("budget.showing", { count: receipts.length })}</span></div>
    {[...groups].map(([label, items]) => <div key={label} className="space-y-2">
      <h3 className="text-label-md text-muted-foreground">{label}</h3>
      {items.map((receipt) => <ReceiptRowCard key={receipt.id} receipt={receipt} onOpen={() => onOpen(receipt.id)} />)}
    </div>)}
  </section>;
}
