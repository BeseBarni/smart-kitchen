import { Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import type { InventoryItem } from "../types";
import { LOCALE_META, useText } from "@/lib/i18n";

export function FreshnessAlert({ items }: { items: readonly InventoryItem[] }): React.JSX.Element | null {
  const { t, locale, formatNumber } = useText();
  if (!items.length) return null;
  const portions = items.reduce((total, item) => total + item.remainingQuantity, 0);
  return (
    <section aria-label={t("inventory.freshnessAlert")} className="rounded-xl border border-warning-border bg-warning-surface p-3.5">
      <div className="flex items-start gap-3">
        <Clock3 size={20} className="mt-1 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase text-[color:var(--stitch-tertiary)]">{t("inventory.urgent")}</p>
          <p className="text-title-sm">{t(new Intl.PluralRules(LOCALE_META[locale].tag).select(portions) === "one" ? "inventory.expiringOne" : "inventory.expiringOther", { count: formatNumber(portions) })}</p>
          <p className="text-body-sm text-muted-foreground">{items.map((item) => item.name).join(" · ")}</p>
        </div>
        <Link href="/chat?prompt=rescue" className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-label-md text-primary-foreground">
          <Sparkles size={16} aria-hidden="true" /> {t("inventory.rescue")}
        </Link>
      </div>
    </section>
  );
}
