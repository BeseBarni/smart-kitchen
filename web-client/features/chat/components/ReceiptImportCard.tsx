"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { inventoryApi, inventoryKeys } from "@/features/inventory";
import type { UiDirective } from "../types";
import { useChatUiStore } from "../stores/chat-ui.store";
import { receiptBatchInput } from "../utils/receipt-import";

type ReceiptDirective = Extract<UiDirective, { component: "receipt_import_card" }>;

export function ReceiptImportCard({ directive }: { directive: ReceiptDirective }): React.JSX.Element {
  const { t, formatDate, formatNumber } = useText();
  const queryClient = useQueryClient();
  const receiptKey = [
    directive.merchant ?? "",
    directive.purchasedAt ?? "",
    directive.totalAmount?.toString() ?? "",
    directive.items.map((item) => `${item.tempId}:${item.name}`).join("|"),
  ].join(":");
  const alreadyImported = useChatUiStore((state) => state.importedReceiptKeys[receiptKey] === true);
  const markReceiptImported = useChatUiStore((state) => state.markReceiptImported);
  const [confirmed, setConfirmed] = useState(alreadyImported);
  const [items, setItems] = useState(directive.items.map((item) => ({ ...item, selected: true })));
  const mutation = useMutation({
    mutationFn: () => inventoryApi.batchCreate(receiptBatchInput(directive, items)),
    onSuccess: async () => {
      setConfirmed(true);
      markReceiptImported(receiptKey);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.message(t("chat.receiptImported"));
    },
    onError: () => toast.error(t("chat.receiptImportError")),
  });

  if (confirmed) {
    return (
      <section aria-label={t("chat.receiptImport")} className="flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary p-3.5 text-body-sm">
        <Check size={18} aria-hidden="true" />{t("chat.receiptImported")}
      </section>
    );
  }

  return (
    <section aria-label={t("chat.receiptImport")} className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-sm">{directive.merchant ?? t("chat.receipt")}</h2>
          {directive.purchasedAt ? <time dateTime={directive.purchasedAt} className="text-label-md text-muted-foreground">{formatDate(new Date(directive.purchasedAt))}</time> : null}
        </div>
        {directive.totalAmount != null ? <strong className="text-label-lg">{formatNumber(directive.totalAmount)} {directive.currency}</strong> : null}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.tempId} className="rounded-lg border border-border p-2.5">
            <div className="flex items-start gap-2">
              <input type="checkbox" checked={item.selected} onChange={(event) => setItems((current) => current.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, selected: event.target.checked } : entry))} className="mt-1 size-5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-label-lg">{item.name}</span>
                  {item.confidence === "low" ? <TriangleAlert size={16} className="text-amber-600" aria-label={t("chat.lowConfidence")} /> : null}
                </div>
                <p className="text-label-md text-muted-foreground">{formatNumber(item.quantity)} {item.unit}</p>
              </div>
              {item.priceAmount != null ? <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-label-sm">{formatNumber(item.priceAmount)} {directive.currency}</span> : null}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1" aria-label={t("chat.storage")}>
              {(["fridge", "freezer", "pantry"] as const).map((location) => (
                <button key={location} type="button" onClick={() => setItems((current) => current.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, storageLocation: location } : entry))}
                  className={`min-h-11 rounded-lg border px-1 text-label-sm ${item.storageLocation === location ? "border-primary bg-primary/10" : "border-border"}`}>
                  {t(location === "fridge" ? "chat.storageFridge" : location === "freezer" ? "chat.storageFreezer" : "chat.storagePantry")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button type="button" className="h-11 w-full" disabled={!items.some((item) => item.selected) || mutation.isPending}
        onClick={() => mutation.mutate()}>
        {mutation.isPending ? t("chat.importingReceipt") : t("chat.addSelectedInventory")}
      </Button>
    </section>
  );
}
