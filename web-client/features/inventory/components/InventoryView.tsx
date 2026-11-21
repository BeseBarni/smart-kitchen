"use client";

import { toast } from "sonner";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpiringInventory, useInventory, useInventoryMutations, useInventorySummary } from "../hooks/use-inventory";
import { useInventoryUiStore } from "../stores/inventory-ui.store";
import type { InventoryInput } from "../types";
import { todayLocal } from "../utils/inventory-formatters";
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
  const ui = useInventoryUiStore();
  const filters = {
    ...(ui.filter !== "all" ? { storageLocation: ui.filter } : {}),
    ...(ui.search ? { search: ui.search } : {}),
  };
  const query = useInventory(filters);
  const summary = useInventorySummary();
  const expiring = useExpiringInventory();
  const { create, update, remove, adjust, consume, discard } = useInventoryMutations();
  const busy = create.isPending || update.isPending || remove.isPending || adjust.isPending || consume.isPending || discard.isPending;
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
      toast.success("Inventory updated.");
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
  const logEaten = async (id: string): Promise<void> => {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      toast.error("This item is no longer available. Refresh inventory and try again.");
      return;
    }
    if (item.fiberPerUnit === null) {
      toast.error("Add fiber per unit before logging this item.");
      ui.openEdit(id);
      return;
    }
    try {
      await consume.mutateAsync({ id, quantity: 1 });
      toast.success("Meal logged.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log this meal.");
    }
  };
  const discardItem = async (id: string): Promise<void> => {
    try {
      await discard.mutateAsync(id);
      toast.success("Item discarded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not discard this item.");
    }
  };
  const deleteItem = async (id: string): Promise<void> => {
    try {
      await remove.mutateAsync(id);
      toast.success("Item deleted.");
      ui.closeSheet();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this item.");
      throw error;
    }
  };
  const retry = (): void => {
    void query.refetch();
    void summary.refetch();
    void expiring.refetch();
  };

  if (query.isPending || summary.isPending || expiring.isPending || !asOf) return <div role="status" aria-label="Loading inventory" className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>;
  if (query.isError || summary.isError || expiring.isError) return <div role="alert" className="space-y-3 py-8"><p>Could not load your inventory.</p><Button type="button" className="h-11" onClick={retry}>Try again</Button></div>;

  const counts = {
    all: summary.data.totalQuantity,
    fridge: summary.data.byLocation.fridge.quantity,
    freezer: summary.data.byLocation.freezer.quantity,
    pantry: summary.data.byLocation.pantry.quantity,
  };

  return (
    <div className="space-y-3 pb-8">
      <InventoryHeader total={counts.all} search={ui.search} searchOpen={ui.searchOpen} onSearch={ui.setSearch} onToggleSearch={() => { ui.setSearchOpen(!ui.searchOpen); if (ui.searchOpen) ui.setSearch(""); }} onAdd={ui.openAdd} />
      <InventoryFilters filter={ui.filter} counts={counts} onChange={ui.setFilter} />
      <FreshnessAlert items={expiring.data ?? []} />
      <InventoryList items={items} asOf={asOf} disabled={busy} empty={summary.data.totalItems === 0} onEdit={ui.openEdit} onAdjust={(id, delta) => void changePortions(id, delta)} onConsume={(id) => void logEaten(id)} onDiscard={(id) => void discardItem(id)} />
      <InventoryTip />
      {ui.sheet === "add" && <InventoryItemSheet busy={busy} onClose={ui.closeSheet} onSave={save} />}
      {ui.sheet === "edit" && selected && <InventoryItemSheet key={selected.id} item={selected} busy={busy} onClose={ui.closeSheet} onSave={save} onDelete={deleteItem} />}
    </div>
  );
}
