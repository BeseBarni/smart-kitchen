"use client";

import type { ProfileDto } from "@app/modules/schemas";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMealTrackerUiStore } from "../stores/meal-tracker-ui.store";
import { ManualLogForm } from "./ManualLogForm";
import { StockLogForm } from "./StockLogForm";
import { useText } from "@/lib/i18n";

export function LogMealSheet({ date, profile }: { date: string; profile: ProfileDto }): React.JSX.Element {
  const { t } = useText();
  const ui = useMealTrackerUiStore();
  return <Sheet open={ui.activeLogSheet !== "closed"} onOpenChange={(open) => { if (!open) ui.closeLog(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <SheetTitle className="pr-10">{t("mealTracker.logMeal")}</SheetTitle><SheetDescription>{t("mealTracker.logDescription")}</SheetDescription>
      <div className="my-3 flex gap-2"><button type="button" className="min-h-11 px-3" aria-pressed={ui.activeLogSheet === "from-inventory"} onClick={() => ui.openLog("from-inventory", ui.preselectedMealType ?? undefined)}>{t("mealTracker.fromStock")}</button><button type="button" className="min-h-11 px-3" aria-pressed={ui.activeLogSheet === "manual"} onClick={() => ui.openLog("manual", ui.preselectedMealType ?? undefined)}>{t("mealTracker.manualEntry")}</button></div>
      {ui.activeLogSheet === "from-inventory" ? <StockLogForm date={date} mealType={ui.preselectedMealType} onClose={ui.closeLog} /> : <ManualLogForm date={date} profile={profile} mealType={ui.preselectedMealType} onClose={ui.closeLog} />}
    </SheetContent>
  </Sheet>;
}
