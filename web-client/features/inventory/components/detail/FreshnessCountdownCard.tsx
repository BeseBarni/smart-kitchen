import type { InventoryDetail } from "../../types";
import { useText } from "@/lib/i18n";

interface Props { item: InventoryDetail }

export function FreshnessCountdownCard({ item }: Props): React.JSX.Element {
  const { t, formatNumber } = useText();
  const ms = item.freshness.msRemaining;
  let label: string;
  let tone = "bg-muted";
  if (ms === null) label = t("inventory.noExpiry");
  else if (ms < 0) {
    const days = Math.ceil(-ms / 86_400_000);
    label = t("inventory.expiredAgo", { count: formatNumber(days) });
    tone = "bg-destructive";
  } else if (ms < 24 * 60 * 60 * 1000) {
    label = t("inventory.expiresInHours", { count: formatNumber(Math.max(1, Math.ceil(ms / 3_600_000))) });
    tone = "bg-destructive";
  } else {
    const days = Math.ceil(ms / 86_400_000);
    label = t("inventory.daysLeft", { count: formatNumber(days) });
    tone = days <= 1 ? "bg-destructive" : days <= 3 ? "bg-[color:var(--stitch-tertiary)]" : "bg-primary";
  }
  const life = item.freshness.shelfLifeDaysForCurrentLocation;
  const percent = ms === null || !life ? 0 : Math.max(0, Math.min(100, ms / (life * 86_400_000) * 100));
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <p className="text-label-sm text-muted-foreground">{t("inventory.detailFreshness")}</p>
      <p className="mt-1 text-title-md">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
