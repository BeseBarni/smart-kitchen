"use client";

import type { InventoryDetail } from "../../types";
import { useSwitchStorage } from "../../hooks/use-switch-storage";
import { useText } from "@/lib/i18n";

interface Props { item: InventoryDetail }

export function StorageMethodSwitcher({ item }: Props): React.JSX.Element {
  const { t, formatNumber } = useText();
  const switchStorage = useSwitchStorage();
  const locations = ["fridge", "freezer", "pantry"] as const;
  const shelfLabel = (days: number | null | undefined): string => {
    if (!days) return t("inventory.shelfNotRecommended");
    if (days >= 60) return t("inventory.shelfMonths", { count: formatNumber(Math.max(1, Math.round(days / 30))) });
    if (days >= 14) return t("inventory.shelfWeeks", { count: formatNumber(Math.round(days / 7)) });
    return t("inventory.shelfDays", { count: formatNumber(days) });
  };
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h3 className="mb-3 text-title-sm">{t("inventory.detailStorage")}</h3>
      <div className="grid grid-cols-3 gap-2">
        {locations.map((location) => (
          <button
            key={location}
            type="button"
            disabled={switchStorage.isPending}
            onClick={() => switchStorage.mutate({ id: item.id, storageLocation: location })}
            className={`min-h-11 rounded-xl border px-2 py-2 text-center ${
              item.storageLocation === location ? "border-primary bg-primary/10" : "border-border"
            }`}
            aria-pressed={item.storageLocation === location}
          >
            <span className="block text-label-md">{t(`inventory.${location}`)}</span>
            <span className="block text-label-sm text-muted-foreground">{shelfLabel(item.shelfLifeDays?.[location])}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-label-sm text-muted-foreground">{t("inventory.storageSwitchNote")}</p>
    </section>
  );
}
