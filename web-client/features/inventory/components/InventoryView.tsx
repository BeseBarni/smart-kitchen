"use client";

import { toast } from "sonner";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory, useInventoryMutations } from "../hooks/use-inventory";
import { useInventoryUiStore } from "../stores/inventory-ui.store";
import type { InventoryInput } from "../types";
import { todayLocal } from "../utils/inventory-formatters";
import { filterInventory, inventoryCounts, rescueItems } from "../utils/inventory-selectors";
import { FreshnessAlert } from "./FreshnessAlert";
import { InventoryFilters } from "./InventoryFilters";
import { InventoryHeader } from "./InventoryHeader";
import { InventoryItemSheet } from "./InventoryItemSheet";
import { InventoryList } from "./InventoryList";
import { InventoryTip } from "./InventoryTip";

function subscribeToDate(callback: () => void): () => void {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", callback); };
}

function serverDate(): null {
  return null;
}

export function InventoryView(): React.JSX.Element {
  const query = useInventory();
  const { create, update, adjust } = useInventoryMutations();
  const ui = useInventoryUiStore();
  const busy = create.isPending || update.isPending || adjust.isPending;
  const items = query.data ?? [];
  const asOf = useSyncExternalStore(subscribeToDate, todayLocal, serverDate);
  const selected = items.find((item) => item.id === ui.selectedId);
  const save = async (input: InventoryInput): Promise<void> => {
    try {
      if (ui.sheet === "edit") {
        if (!ui.selectedId) throw new Error("No item selected.");
        await update.mutateAsync({ id: ui.selectedId, input });
      } else {
        await create.mutateAsync(input);
      }
      toast.success("Demo inventory updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this item.");
      throw error;
    }
  };
  const changePortions = async (id: string, delta: 1 | -1): Promise<void> => {
    try {
      await adjust.mutateAsync({ id, delta });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update portions.");
    }
  };

  if (query.isPending || !asOf) return <div role="status" aria-label="Loading inventory" className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>;
  if (query.isError) return <div role="alert" className="space-y-3 py-8"><p>Could not load demo inventory.</p><Button type="button" className="h-11" onClick={() => void query.refetch()}>Try again</Button></div>;

  return (
    <div className="space-y-3 pb-8">
      <InventoryHeader total={inventoryCounts(items).all} search={ui.search} searchOpen={ui.searchOpen} onSearch={ui.setSearch} onToggleSearch={() => { ui.setSearchOpen(!ui.searchOpen); if (ui.searchOpen) ui.setSearch(""); }} onAdd={ui.openAdd} />
      <InventoryFilters filter={ui.filter} counts={inventoryCounts(items)} onChange={ui.setFilter} />
      <FreshnessAlert items={rescueItems(items, asOf)} />
      <InventoryList items={filterInventory(items, ui.filter, ui.search)} asOf={asOf} disabled={busy} empty={!items.length} onEdit={ui.openEdit} onAdjust={(id, delta) => void changePortions(id, delta)} />
      <InventoryTip />
      {ui.sheet === "add" && <InventoryItemSheet busy={busy} onClose={ui.closeSheet} onSave={save} />}
      {ui.sheet === "edit" && selected && <InventoryItemSheet key={selected.id} item={selected} busy={busy} onClose={ui.closeSheet} onSave={save} />}
    </div>
  );
}
