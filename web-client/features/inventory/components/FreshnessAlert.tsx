import { Clock3, Sparkles } from "lucide-react";
import type { InventoryItem } from "../types";

export function FreshnessAlert({ items }: { items: readonly InventoryItem[] }): React.JSX.Element | null {
  if (!items.length) return null;
  const portions = items.reduce((total, item) => total + item.portions, 0);
  return (
    <section aria-label="Food freshness alert" className="rounded-xl border border-warning-border bg-warning-surface p-3.5">
      <div className="flex items-start gap-3">
        <Clock3 size={20} className="mt-1 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase text-warning">Urgent freshness</p>
          <p className="text-title-sm">{portions} {portions === 1 ? "portion" : "portions"} expiring within 2 days</p>
          <p className="text-body-sm text-muted-foreground">{items.map((item) => item.name).join(" · ")}</p>
        </div>
        <button type="button" disabled title="AI Rescue is unavailable in this demo" className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-label-md text-primary-foreground opacity-60">
          <Sparkles size={16} aria-hidden="true" /> AI Rescue
        </button>
      </div>
    </section>
  );
}
