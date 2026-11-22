import Link from "next/link";
import { ArrowRight, CircleCheck, Refrigerator, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UiDirective } from "../types";
import { LOCALE_META, useText } from "@/lib/i18n";
import { ResolvedEntityImage } from "@/components/media/ResolvedEntityImage";

type Props = Extract<UiDirective, { component: "inventory_action_card" }>;

export function InventoryActionCard({ action, items }: Props): React.JSX.Element {
  const { t, locale, formatNumber } = useText();
  const actionLabel = t(`chat.${action}`);
  return (
    <section aria-label={t("chat.inventoryAction", { action: actionLabel })} className="rounded-xl border border-primary/20 bg-secondary p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-title-sm text-secondary-foreground"><CircleCheck size={18} aria-hidden="true" />{t(new Intl.PluralRules(LOCALE_META[locale].tag).select(items.length) === "one" ? "chat.actionOne" : "chat.actionOther", { action: actionLabel, count: formatNumber(items.length) })}</h2>
        <Badge variant="secondary" className="bg-white text-secondary-foreground">{t("chat.synced")}</Badge>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const Icon = item.location === "freezer" ? Snowflake : Refrigerator;
          return (
            <li key={item.id} className="flex gap-2 rounded-lg bg-card p-2">
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                <ResolvedEntityImage
                  entity={{ stockImageKind: item.stockImageKind, stockImageName: item.stockImageName, imageUrl: item.imageUrl }}
                  alt=""
                  size="small"
                  fallback={<Icon size={16} className="text-secondary-foreground" aria-hidden="true" />}
                />
              </span>
              <div className="min-w-0">
                <div className="truncate text-title-sm">{item.name}</div>
                <div className="text-label-md text-muted-foreground">{formatNumber(item.quantity)} {item.unit} · {t(`inventory.${item.location}`)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/inventory" className="mt-1 flex min-h-11 items-center gap-1 text-label-md text-secondary-foreground">
        {t("chat.viewInventory")} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
