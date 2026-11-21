"use client";

import { Pencil, Zap } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDailyTracker } from "../hooks/use-daily-tracker";
import { useMealTrackerUiStore } from "../stores/meal-tracker-ui.store";
import { groupMeals, type MealGroup } from "../utils/nutrition.utils";
import { localDate } from "../utils/date.utils";
import { CalorieHeroCard } from "./CalorieHeroCard";
import { DateSwitcher } from "./DateSwitcher";
import { DeleteMealDialog } from "./DeleteMealDialog";
import { EditTargetsSheet } from "./EditTargetsSheet";
import { LogMealSheet } from "./LogMealSheet";
import { MacroProgressRow } from "./MacroProgressRow";
import { MealGroupSection } from "./MealGroupSection";
import { SuggestionCard } from "./SuggestionCard";

const groups: MealGroup[] = ["breakfast", "lunch", "snack", "dinner", "other"];

export function MealTrackerView(): React.JSX.Element {
  const ui = useMealTrackerUiStore();
  const { selectedDate, goToToday } = ui;
  const { summary, logs, profile } = useDailyTracker(ui.selectedDate);
  useEffect(() => { if (!selectedDate) goToToday(); }, [selectedDate, goToToday]);
  useEffect(() => {
    let previousDay = localDate();
    let previousZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const sync = (): void => {
      const currentDay = localDate();
      const currentZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const state = useMealTrackerUiStore.getState();
      if (currentDay !== previousDay && state.selectedDate === previousDay) state.setDate(currentDay);
      else if (currentZone !== previousZone && state.selectedDate) state.setDate(state.selectedDate);
      previousDay = currentDay;
      previousZone = currentZone;
    };
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", sync); };
  }, []);
  if (!ui.selectedDate || summary.isPending || logs.isPending || profile.isPending) return <div role="status" aria-label="Loading tracker" className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-40" /><Skeleton className="h-48" /></div>;
  if (summary.isError || logs.isError || profile.isError) return <div role="alert" className="space-y-3"><p>Could not load your tracker.</p><Button type="button" onClick={() => { void summary.refetch(); void logs.refetch(); void profile.refetch(); }}>Try again</Button></div>;
  const grouped = groupMeals(logs.data);
  return <div className="space-y-3 pb-16">
    <DateSwitcher date={ui.selectedDate} onChange={ui.setDate} />
    <CalorieHeroCard calories={summary.data.calories} target={profile.data.dailyCalorieTarget} incomplete={summary.data.unknownCaloriesCount > 0} onEdit={() => ui.setTargetsOpen(true)} />
    <MacroProgressRow macros={[
      { label: "Protein", value: summary.data.proteinG, target: profile.data.dailyProteinG, incomplete: summary.data.unknownProteinCount > 0 },
      { label: "Carbs", value: summary.data.carbsG, target: profile.data.dailyCarbsG, incomplete: summary.data.unknownCarbsCount > 0 },
      { label: "Fats", value: summary.data.fatG, target: profile.data.dailyFatG, incomplete: summary.data.unknownFatCount > 0 },
      { label: "Fiber", value: summary.data.fiberG, target: profile.data.dailyFiberG, incomplete: summary.data.unknownFiberCount > 0 },
    ]} />
    <SuggestionCard date={ui.selectedDate} />
    <div className="flex items-center justify-between"><h2 className="text-headline-md">Meal timeline</h2><span className="text-label-md tabular-nums">{summary.data.mealCount} logged</span></div>
    {groups.filter((group) => group !== "other" || grouped.other.length > 0).map((group) => <MealGroupSection key={group} group={group} logs={grouped[group]} onAdd={() => { if (group !== "other") ui.openLog("from-inventory", group); }} onDelete={(log) => ui.setDeleteCandidate({ id: log.id, name: log.name, hasInventoryLink: log.inventoryItemId !== null })} />)}
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-20 flex gap-2 rounded-2xl bg-white/95 p-1.5 shadow-xl">
      <Button type="button" className="h-12 flex-1 bg-stitch-primary" onClick={() => ui.openLog("from-inventory")}><Zap size={18} />Eat From Prep Stock</Button>
      <Button type="button" variant="secondary" className="size-12" aria-label="Custom meal log" onClick={() => ui.openLog("manual")}><Pencil size={18} /></Button>
    </div>
    {ui.activeLogSheet !== "closed" && <LogMealSheet date={ui.selectedDate} profile={profile.data} />}
    {ui.isTargetsSheetOpen && <EditTargetsSheet profile={profile.data} onClose={() => ui.setTargetsOpen(false)} />}
    {ui.deleteCandidate && <DeleteMealDialog candidate={ui.deleteCandidate} onClose={() => ui.setDeleteCandidate(null)} />}
  </div>;
}
