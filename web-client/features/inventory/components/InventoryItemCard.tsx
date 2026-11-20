import { CookingPot, Pencil, Trash2, Utensils } from "lucide-react";
import type { InventoryItem } from "../types";
import { daysUntil, freshnessLabel } from "../utils/inventory-formatters";
import { PortionStepper } from "./PortionStepper";
import { StorageBadge } from "./StorageBadge";

interface Props {
  item: InventoryItem;
  asOf: string;
  disabled: boolean;
  onEdit: (id: string) => void;
  onAdjust: (id: string, delta: 1 | -1) => void;
  onConsume: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function InventoryItemCard({ item, asOf, disabled, onEdit, onAdjust, onConsume, onDiscard }: Props): React.JSX.Element {
  const days = item.expiresAt ? daysUntil(item.expiresAt.slice(0, 10), asOf) : Number.POSITIVE_INFINITY;
  const statusColor = days <= 1 ? "text-destructive" : days <= 3 ? "text-[color:var(--stitch-tertiary)] dark:text-warning" : "text-muted-foreground";
  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CookingPot size={21} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-title-sm">{item.name}</h2><StorageBadge storage={item.storageLocation} />
          </div>
          <p className={`mt-0.5 text-label-sm ${statusColor}`}>{Number.isFinite(days) ? freshnessLabel(days) : "No expiry date"}</p>
          <p className="text-body-sm text-muted-foreground">{item.remainingQuantity} {item.unit} remaining</p>
        </div>
        <button type="button" disabled={disabled} aria-label={`Edit ${item.name} in ${item.storageLocation}`} onClick={() => onEdit(item.id)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
          <Pencil size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 flex justify-end">
        <PortionStepper name={`${item.name} in ${item.storageLocation}`} portions={item.remainingQuantity} disabled={disabled} onAdjust={(delta) => onAdjust(item.id, delta)} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" disabled={disabled} onClick={() => onConsume(item.id)} className="flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-label-md disabled:opacity-50">
          <Utensils size={15} aria-hidden="true" /> Log eaten
        </button>
        <button type="button" disabled={disabled} onClick={() => onDiscard(item.id)} aria-label={`Discard ${item.name}`} className="flex size-11 items-center justify-center rounded-full text-destructive disabled:opacity-50">
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
