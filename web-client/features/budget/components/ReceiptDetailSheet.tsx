"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { useBudgetUiStore } from "../stores/budget-ui.store";
import { useReceiptDetail } from "../hooks/use-receipt-detail";
import { useBudgetMutations } from "../hooks/use-budget-mutations";
import { useBudgetOverview } from "../hooks/use-budget-overview";
import { expenseCategoryLabel } from "../utils/category-label.utils";

export function ReceiptDetailSheet(): React.JSX.Element {
  const { t, formatCurrency, formatDate } = useText();
  const ui = useBudgetUiStore();
  const detail = useReceiptDetail(ui.selectedReceiptId);
  const overview = useBudgetOverview();
  const mutations = useBudgetMutations();
  const receipt = detail.data;
  const categories = overview.categories.data ?? [];
  const close = (): void => ui.closeReceipt();
  return <Sheet open={Boolean(ui.selectedReceiptId)} onOpenChange={(open) => { if (!open) close(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <SheetTitle className="pr-10">{receipt?.title ?? receipt?.merchant?.name ?? t("budget.receipt")}</SheetTitle>
      <SheetDescription>{receipt ? formatDate(new Date(receipt.purchasedAt), { dateStyle: "medium", timeStyle: "short" }) : t("budget.loading")}</SheetDescription>
      {receipt && <>
        {receipt.mediaUrl && <button type="button" className="w-full" onClick={() => window.open(receipt.mediaUrl ?? undefined, "_blank", "noopener,noreferrer")}><img src={receipt.mediaUrl} alt={t("budget.photo")} className="aspect-[16/9] w-full rounded-xl object-cover" /></button>}
        <div className="flex items-center justify-between rounded-xl border border-outline-variant p-3">
          <div><span className="block text-label-md text-muted-foreground">{receipt.merchant?.name ?? t("budget.manual")}</span><span className="text-label-md">{t(receipt.source === "scanned" ? "budget.receipt" : "budget.manual")}</span></div>
          <strong className="text-headline-md tabular-nums">{formatCurrency(receipt.totalAmount, receipt.currency)}</strong>
        </div>
        <div className="space-y-2">
          {receipt.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_6rem] gap-2 rounded-xl border border-outline-variant p-3">
            <div><strong className="block text-body-md">{item.name}</strong>{item.quantity !== 1 && <span className="text-label-md text-muted-foreground">{item.quantity} {item.unit ?? ""} • {formatCurrency(item.unitPrice, receipt.currency)}</span>}</div>
            <strong className="text-right tabular-nums">{formatCurrency(item.amount, receipt.currency)}</strong>
            <select aria-label={t("budget.category")} value={item.category.id} onChange={(event) => {
              const items = receipt.items.map((line) => ({
                name: line.name,
                categoryId: line.id === item.id ? event.target.value : line.category.id,
                amount: line.amount,
                quantity: line.quantity,
                unit: line.unit ?? undefined,
                rawReceiptText: line.rawReceiptText ?? undefined,
                inventoryItemId: line.inventoryItemId,
                ingredientId: line.ingredientId,
              }));
              mutations.update.mutate({ id: receipt.id, input: { items } });
            }} className="h-11 rounded-lg border border-outline-variant px-2">{categories.map((category) => <option key={category.id} value={category.id}>{expenseCategoryLabel(category, t)}</option>)}</select>
          </div>)}
        </div>
        <div className="flex gap-2"><Button type="button" className="h-12 flex-1" onClick={() => ui.setEditingReceipt(receipt.id)}>{t("budget.editReceipt")}</Button>
          <Button type="button" variant="outline" className="h-12 flex-1 text-destructive" onClick={() => ui.setDeleteCandidate({ id: receipt.id, title: receipt.title ?? receipt.merchant?.name ?? t("budget.receipt"), totalAmount: receipt.totalAmount, itemCount: receipt.itemCount })}>{t("budget.deleteReceipt")}</Button></div>
      </>}
    </SheetContent>
  </Sheet>;
}
