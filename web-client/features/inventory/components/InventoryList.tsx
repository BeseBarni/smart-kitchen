import type { InventoryItem } from "../types";
import { InventoryItemCard } from "./InventoryItemCard";
import { useText } from "@/lib/i18n";

interface Props {
  items: readonly InventoryItem[];
  asOf: string;
  disabled: boolean;
  empty: boolean;
  onEdit: (id: string) => void;
  onAdjust: (id: string, delta: 1 | -1) => void;
  onConsume: (id: string) => void;
  onDiscard: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

export function InventoryList({ items, asOf, disabled, empty, onEdit, onAdjust, onConsume, onDiscard, onOpenDetail }: Props): React.JSX.Element {
  const { t } = useText();
  if (!items.length) {
    return <p className="rounded-xl border border-border bg-card p-5 text-body-md text-muted-foreground">{t(empty ? "inventory.empty" : "inventory.noMatches")}</p>;
  }
  return <div className="flex flex-col gap-2.5">{items.map((item) => <InventoryItemCard key={item.id} item={item} asOf={asOf} disabled={disabled} onEdit={onEdit} onAdjust={onAdjust} onConsume={onConsume} onDiscard={onDiscard} onOpenDetail={onOpenDetail} />)}</div>;
}
