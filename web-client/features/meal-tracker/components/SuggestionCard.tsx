"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMealSuggestions } from "../hooks/use-meal-suggestions";
import { localDate } from "../utils/date.utils";
import { useMealTrackerUiStore } from "../stores/meal-tracker-ui.store";
import { useText } from "@/lib/i18n";

export function SuggestionCard({ date }: { date: string }): React.JSX.Element | null {
  const { t, formatNumber } = useText();
  const suggestions = useMealSuggestions(date);
  const openLog = useMealTrackerUiStore((state) => state.openLog);
  if (date !== localDate()) return null;
  return <section className="space-y-2 rounded-xl bg-stitch-secondary-container/40 p-3">
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-title-sm text-stitch-primary"><Sparkles size={18} />{t("mealTracker.suggestions")}</h2><button className="grid size-11 place-items-center" type="button" aria-label={t("mealTracker.refreshSuggestions")} onClick={() => void suggestions.refetch()} disabled={suggestions.isFetching}><RefreshCw size={18} /></button></div>
    <p className="text-label-md">{t("mealTracker.advisory")}</p>
    {suggestions.isPending ? <p role="status" className="text-body-sm">{t("mealTracker.preparing")}</p> : suggestions.isError ? <div role="alert" className="text-body-sm"><p>{t("mealTracker.suggestionsError")}</p><Button type="button" variant="outline" onClick={() => void suggestions.refetch()}>{t("common.retry")}</Button></div> : <>
      {suggestions.data.suggestions.map((item) => <div key={item.mealType} className="rounded-lg bg-white p-3"><h3 className="text-title-sm">{t(`mealTracker.${item.mealType}`)}: {item.title}</h3><p className="text-body-sm">{item.explanation}</p><p className="text-label-md tabular-nums">{item.items.map((stock) => `${formatNumber(stock.quantity)} ${stock.unit} ${stock.name}`).join(" · ")}</p><p className="text-label-md tabular-nums">{t("mealTracker.estimatedFiber", { count: formatNumber(item.estimatedFiberG) })}</p><Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => openLog("from-inventory", item.mealType)}>{t("mealTracker.logStockFor", { type: t(`mealTracker.${item.mealType}`) })}</Button></div>)}
      <p className="text-label-md">{suggestions.data.note}</p>
    </>}
  </section>;
}
