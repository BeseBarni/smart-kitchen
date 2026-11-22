"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import {
  useBudgetOverview,
  useCommitScannedReceipt,
} from "@/features/budget";
import type { ChatTurn, UiDirective } from "../types";
import { ReceiptImportItemRow } from "./ReceiptImportItemRow";

type ReceiptDirective = Extract<UiDirective, { component: "receipt_import_card" }>;

export function ReceiptImportCard({ directive, source, disabled }: {
  directive: ReceiptDirective;
  source?: NonNullable<ChatTurn["receiptSources"]>[number];
  disabled: boolean;
}) {
  const { t, formatDate, formatNumber } = useText();
  const overview = useBudgetOverview();
  const commit = useCommitScannedReceipt();
  const [confirmed, setConfirmed] = useState(false);
  const [merchantId, setMerchantId] = useState(directive.matchedMerchantId ?? null);
  const [merchantName, setMerchantName] = useState(directive.merchantName ?? directive.merchant ?? "");
  const [items, setItems] = useState(directive.items.map((item) => ({
    ...item,
    selected: true,
    addToInventory: item.addToInventory ?? item.isFoodItem,
  })));

  const setItem = (tempId: string, patch: Partial<(typeof items)[number]>) =>
    setItems((current) => current.map((item) => item.tempId === tempId ? { ...item, ...patch } : item));
  const total = items.filter((item) => item.selected).reduce((sum, item) =>
    sum + (item.amount ?? item.priceAmount ?? 0), 0);
  const stockCount = items.filter((item) => item.selected && item.addToInventory).length;
  const categories = overview.categories.data ?? [];

  if (confirmed || source?.imported) {
    return (
      <section aria-label={t("chat.receiptImport")} className="space-y-3 rounded-xl border border-primary/20 bg-secondary p-3.5">
        <p className="flex items-center gap-2 text-body-sm"><Check size={18} />{t("chat.receiptImported")}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => { window.location.assign("/budget"); }}>{t("chat.viewBudget")}</Button>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => { window.location.assign("/inventory"); }}>{t("chat.viewInventory")}</Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t("chat.receiptImport")} className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      {directive.mediaUrl ? <img src={directive.mediaUrl} alt={t("chat.receiptPreview")} className="h-28 w-full rounded-lg object-cover" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-sm">{directive.matchedMerchantId ? t("chat.matchedMerchant") : merchantName || t("chat.receipt")}</h2>
          <p className="text-label-md text-muted-foreground">{merchantName}</p>
          {directive.purchasedAt ? <time dateTime={directive.purchasedAt}>{formatDate(new Date(directive.purchasedAt))}</time> : null}
        </div>
        <strong className="tabular-nums text-label-lg">{formatNumber(total)} {directive.currency}</strong>
      </div>
      {directive.ambiguities?.length ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-label-md text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />{directive.ambiguities.join(" ")}
        </p>
      ) : null}
      <div className="space-y-2">
        {items.map((item) => (
          <ReceiptImportItemRow
            key={item.tempId}
            item={item}
            currency={directive.currency}
            categories={categories}
            onChange={(patch) => setItem(item.tempId, patch)}
          />
        ))}
      </div>
      <Button
        type="button"
        className="h-11 w-full"
        disabled={disabled || !directive.mediaAssetId || !items.some((item) => item.selected) || commit.isPending}
        onClick={() => commit.mutate({
          mediaAssetId: directive.mediaAssetId,
          ...(merchantId ? { merchantId } : { merchantName }),
          purchasedAt: directive.purchasedAt ?? new Date().toISOString(),
          currency: directive.currency,
          items: items.filter((item) => item.selected).map((item) => ({
            name: item.name,
            rawReceiptText: item.rawReceiptText,
            categoryId: item.categoryId ?? categories.find((category) => category.slug === item.categorySlug)?.id ?? "",
            amount: item.amount ?? item.priceAmount ?? 0,
            quantity: item.quantity,
            unit: item.unit,
            addToInventory: item.addToInventory,
            storageLocation: item.storageLocation,
            shelfLifeDays: item.shelfLifeDays,
            tags: item.suggestedTags,
            stockImageKind: item.stockImageKind,
            stockImageName: item.stockImageName,
          })),
        }, { onSuccess: () => setConfirmed(true) })}
      >
        {commit.isPending ? t("chat.importingReceipt") : stockCount > 0
          ? t("chat.saveReceiptAndStock", { count: stockCount })
          : t("chat.saveReceipt")}
      </Button>
    </section>
  );
}
