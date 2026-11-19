import { CookingPot, Pencil } from "lucide-react";
import type { InventoryItem } from "../types";
import { containerLabel, daysUntil, freshnessLabel } from "../utils/inventory-formatters";
import { PortionStepper } from "./PortionStepper";
import { StorageBadge } from "./StorageBadge";

interface Props {
  item: InventoryItem;
  asOf: string;
  disabled: boolean;
  onEdit: (id: string) => void;
  onAdjust: (id: string, delta: 1 | -1) => void;
}

export function InventoryItemCard({ item, asOf, disabled, onEdit, onAdjust }: Props): React.JSX.Element {
  const days = daysUntil(item.bestBefore, asOf);
  const statusColor = days <= 1 ? "text-destructive" : days <= 3 ? "text-[color:var(--stitch-tertiary)] dark:text-warning" : "text-muted-foreground";
  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CookingPot size={21} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-title-sm">{item.name}</h2><StorageBadge storage={item.storage} />
          </div>
          <p className={`mt-0.5 text-label-sm ${statusColor}`}>{freshnessLabel(days)}</p>
          <p className="text-body-sm text-muted-foreground">{[item.location, containerLabel(item.container)].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" disabled={disabled} aria-label={`Edit ${item.name} in ${item.storage}`} onClick={() => onEdit(item.id)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
          <Pencil size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 flex justify-end">
        <PortionStepper name={`${item.name} in ${item.storage}`} portions={item.portions} disabled={disabled} onAdjust={(delta) => onAdjust(item.id, delta)} />
      </div>
    </article>
  );
}
