import Link from "next/link";
import { ArrowRight, CircleCheck, Refrigerator, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UiDirective } from "../types";

type Props = Extract<UiDirective, { component: "inventory_action_card" }>;

export function InventoryActionCard({ action, items }: Props): React.JSX.Element {
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  return (
    <section aria-label={`Inventory ${action}`} className="rounded-xl border border-primary/20 bg-secondary p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-title-sm text-secondary-foreground"><CircleCheck size={18} aria-hidden="true" />{actionLabel} {items.length === 1 ? "item" : `${items.length} items`}</h2>
        <Badge variant="secondary" className="bg-white text-secondary-foreground">Synced</Badge>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const Icon = item.location === "freezer" ? Snowflake : Refrigerator;
          return (
            <li key={item.id} className="flex gap-2 rounded-lg bg-card p-2">
              <Icon size={16} className="mt-0.5 shrink-0 text-secondary-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <div className="truncate text-title-sm">{item.name}</div>
                <div className="text-label-md text-muted-foreground">{item.quantity} {item.unit} · {item.location}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/inventory" className="mt-1 flex min-h-11 items-center gap-1 text-label-md text-secondary-foreground">
        View in Inventory <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
