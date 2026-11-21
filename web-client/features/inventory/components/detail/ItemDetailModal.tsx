"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryDetail } from "../../hooks/use-inventory-detail";
import { useInventoryMutations } from "../../hooks/use-inventory";
import { useInventoryUiStore } from "../../stores/inventory-ui.store";
import { ItemChipRow } from "./ItemChipRow";
import { ItemMacrosGrid } from "./ItemMacrosGrid";
import { FreshnessCountdownCard } from "./FreshnessCountdownCard";
import { StorageMethodSwitcher } from "./StorageMethodSwitcher";
import { MealIngredientsList } from "./MealIngredientsList";
import { ItemAiActionsSection } from "./ItemAiActionsSection";
import { useText } from "@/lib/i18n";

export function ItemDetailModal(): React.JSX.Element {
  const { t } = useText();
  const id = useInventoryUiStore((state) => state.selectedItemId);
  const close = useInventoryUiStore((state) => state.closeItemDetail);
  const detail = useInventoryDetail(id);
  const mutations = useInventoryMutations();
  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-4 pb-[env(safe-area-inset-bottom)] sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[520px] sm:-translate-x-1/2 sm:rounded-2xl">
        {detail.isPending ? (
          <div className="space-y-3 pt-10" role="status" aria-label={t("inventory.detailLoading")}>
            <SheetTitle className="sr-only">{t("inventory.detailLoading")}</SheetTitle>
            <Skeleton className="h-52 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" />
          </div>
        ) : detail.isError || !detail.data ? (
          <SheetHeader>
            <SheetTitle>{t("inventory.detailLoadError")}</SheetTitle>
            <SheetDescription>{t("inventory.detailLoadErrorDescription")}</SheetDescription>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader className="px-0">
              <SheetTitle>{detail.data.name}</SheetTitle>
              <SheetDescription>{detail.data.storageLocation === "freezer"
                ? t("inventory.detailFrozenSubtitle")
                : t("inventory.detailStoredSubtitle")}</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 pb-4">
              <ItemChipRow item={detail.data} />
              <FreshnessCountdownCard item={detail.data} />
              <ItemMacrosGrid item={detail.data} />
              <StorageMethodSwitcher item={detail.data} />
              {detail.data.recipe && <MealIngredientsList item={detail.data} />}
              <ItemAiActionsSection item={detail.data} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-border"
                  disabled={mutations.consume.isPending}
                  onClick={() => mutations.consume.mutate({ id: detail.data.id, quantity: 1 })}
                >
                  {t("inventory.logEaten")}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-destructive text-destructive"
                  disabled={mutations.discard.isPending}
                  onClick={() => mutations.discard.mutate(detail.data.id)}
                >
                  {t("inventory.discardItem", { name: detail.data.name })}
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
