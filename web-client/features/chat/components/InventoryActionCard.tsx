import { ArrowRight, CircleCheck, Refrigerator, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InventoryAction } from "../types";

export function InventoryActionCard({ actions }: { actions: readonly InventoryAction[] }): React.JSX.Element {
  return (
    <section aria-label="Example inventory actions" className="rounded-xl border border-primary/20 bg-secondary p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-title-sm text-secondary-foreground"><CircleCheck size={18} />Inventory Updated ({actions.length} actions)</h2>
        <Badge variant="secondary" className="bg-white text-secondary-foreground">Example only</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {actions.map((action, index) => {
          const Icon = action.storage === "freezer" ? Snowflake : Refrigerator;
          return (
            <div key={`${action.storage}-${index}`} className="flex gap-2 rounded-lg bg-card p-2">
              <Icon size={16} className="mt-0.5 shrink-0 text-secondary-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <div className="truncate text-title-sm">{action.storage === "freezer" ? "Freezer" : "Fridge"}: {action.name}</div>
                <div className="text-label-md text-muted-foreground">{action.details}</div>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" disabled className="mt-1 flex min-h-11 items-center gap-1 text-label-md text-secondary-foreground opacity-60">
        View in Inventory <ArrowRight size={14} aria-hidden="true" />
      </button>
      <p className="text-label-md text-secondary-foreground">Sample actions only; nothing was synced.</p>
    </section>
  );
}
