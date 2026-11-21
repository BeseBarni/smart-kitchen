"use client";

import type { ProfileDto } from "@app/modules/schemas";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMealTrackerUiStore } from "../stores/meal-tracker-ui.store";
import { ManualLogForm } from "./ManualLogForm";
import { StockLogForm } from "./StockLogForm";

export function LogMealSheet({ date, profile }: { date: string; profile: ProfileDto }): React.JSX.Element {
  const ui = useMealTrackerUiStore();
  return <Sheet open={ui.activeLogSheet !== "closed"} onOpenChange={(open) => { if (!open) ui.closeLog(); }}>
    <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <SheetTitle>Log a meal</SheetTitle><SheetDescription>Choose stock or enter a meal manually.</SheetDescription>
      <div className="my-3 flex gap-2"><button type="button" className="min-h-11 px-3" aria-pressed={ui.activeLogSheet === "from-inventory"} onClick={() => ui.openLog("from-inventory", ui.preselectedMealType ?? undefined)}>From stock</button><button type="button" className="min-h-11 px-3" aria-pressed={ui.activeLogSheet === "manual"} onClick={() => ui.openLog("manual", ui.preselectedMealType ?? undefined)}>Manual entry</button></div>
      {ui.activeLogSheet === "from-inventory" ? <StockLogForm date={date} mealType={ui.preselectedMealType} onClose={ui.closeLog} /> : <ManualLogForm date={date} profile={profile} mealType={ui.preselectedMealType} onClose={ui.closeLog} />}
    </SheetContent>
  </Sheet>;
}
