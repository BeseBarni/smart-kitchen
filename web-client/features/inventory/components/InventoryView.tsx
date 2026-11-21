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
import { getText, useText } from "@/lib/i18n";

function subscribeToDate(callback: () => void): () => void {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", callback); };
}

function serverDate(): null {
  return null;
}

export function InventoryView(): React.JSX.Element {
  const { t } = useText();
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
    if (ui.sheet === "edit") {
      if (!ui.selectedId) return;
      update.mutate({ id: ui.selectedId, input });
    } else {
      create.mutate(input);
    }
    toast.success(getText("inventory.updated"));
  };
  const changePortions = async (id: string, delta: 1 | -1): Promise<void> => {
    adjust.mutate({ id, delta });
  };
  const logEaten = async (id: string): Promise<void> => {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      toast.error(t("inventory.unavailable"));
      return;
    }
    if (item.fiberPerUnit === null) {
      toast.error(t("inventory.missingFiber"));
      ui.openEdit(id);
      return;
    }
    consume.mutate({ id, quantity: 1 });
    toast.success(getText("inventory.mealLogged"));
  };
  const discardItem = async (id: string): Promise<void> => {
    discard.mutate(id);
    toast.success(getText("inventory.discarded"));
  };
  const deleteItem = async (id: string): Promise<void> => {
    remove.mutate(id);
    toast.success(getText("inventory.deleted"));
    ui.closeSheet();
  };
  const retry = (): void => {
    void query.refetch();
    void summary.refetch();
    void expiring.refetch();
  };

  if (query.isPending || summary.isPending || expiring.isPending || !asOf) return <div role="status" aria-label={t("inventory.load")} className="space-y-3 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>;
  if (query.isError || summary.isError || expiring.isError) return <div role="alert" className="space-y-3 py-8"><p>{t("inventory.loadError")}</p><Button type="button" className="h-11" onClick={retry}>{t("common.retry")}</Button></div>;

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
