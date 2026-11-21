"use client";

import { useState } from "react";
import type { InventoryDetail } from "../../types";
import { useText } from "@/lib/i18n";

interface Props { item: InventoryDetail }

export function ItemMacrosGrid({ item }: Props): React.JSX.Element {
  const { t, formatNumber, formatCurrency } = useText();
  const [total, setTotal] = useState(false);
  const multiplier = total ? item.remainingQuantity : 1;
  const value = (amount: number | null) => amount === null
    ? t("common.unknown")
    : formatNumber(amount * multiplier);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-title-sm">{t("inventory.detailMacros")}</h3>
        <button
          type="button"
          onClick={() => setTotal((current) => !current)}
          className="min-h-11 rounded-full border border-border px-3 text-label-sm"
        >
          {t(total ? "inventory.detailPerUnit" : "inventory.detailTotalRemaining")}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-2 tabular-nums sm:grid-cols-5">
        <div><dt className="text-label-sm text-muted-foreground">{t("inventory.detailCalories")}</dt><dd className="text-title-sm">{value(item.caloriesPerUnit)}</dd></div>
        <div><dt className="text-label-sm text-muted-foreground">{t("inventory.detailProtein")}</dt><dd className="text-title-sm">{value(item.proteinPerUnit)}g</dd></div>
        <div><dt className="text-label-sm text-muted-foreground">{t("inventory.detailCarbs")}</dt><dd className="text-title-sm">{value(item.carbsPerUnit)}g</dd></div>
        <div><dt className="text-label-sm text-muted-foreground">{t("inventory.detailFat")}</dt><dd className="text-title-sm">{value(item.fatPerUnit)}g</dd></div>
        <div><dt className="text-label-sm text-muted-foreground">{t("inventory.detailCost")}</dt><dd className="text-title-sm">{item.costPerUnit === null ? t("common.unknown") : formatCurrency(item.costPerUnit * multiplier, item.currency)}</dd></div>
      </dl>
    </section>
  );
}
