"use client";

import type { MealLogDto } from "@app/modules/schemas";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount, type MealGroup } from "../utils/nutrition.utils";
import { useText } from "@/lib/i18n";
import { isOptimisticId } from "@/lib/optimistic";

export function MealGroupSection({ group, logs, onAdd, onDelete }: {
  group: MealGroup; logs: MealLogDto[];
  onAdd: () => void; onDelete: (log: MealLogDto) => void;
}): React.JSX.Element {
  const { t, locale, formatDate } = useText();
  const calories = logs.reduce((sum, log) => sum + (log.calories ?? 0), 0);
  return <section className="rounded-xl bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between"><h3 className="text-title-sm">{t(`mealTracker.${group}`)}</h3><div className="flex items-center"><span className="tabular-nums text-label-md">{formatAmount(calories, locale)} kcal{logs.some((log) => log.calories === null) ? ` ${t("mealTracker.incomplete")}` : ""}</span>{group !== "other" && <button type="button" onClick={onAdd} aria-label={t("mealTracker.addMealType", { type: t(`mealTracker.${group}`) })} className="grid size-11 place-items-center text-stitch-primary"><Plus size={20} /></button>}</div></div>
    {logs.length === 0 ? <p className="text-body-sm text-stitch-on-surface-variant">{t("mealTracker.noMeals")}</p> : <ul>{logs.map((log) => { const syncing = isOptimisticId(log.id); return <li key={log.id} className={`flex items-center justify-between gap-2 border-t border-stitch-surface-container py-1 ${syncing ? "opacity-70" : ""}`}>
      <div className="min-w-0"><p className="text-title-sm">{log.name}{syncing && ` · ${t("common.syncing")}`}</p><p className="text-label-md tabular-nums">{formatAmount(log.quantity, locale)} {log.unit} · {formatDate(new Date(log.eatenAt), { hour: "numeric", minute: "2-digit" })}</p><p className="text-label-sm tabular-nums">{t("mealTracker.macroSummary", { protein: log.proteinG == null ? "—" : formatAmount(log.proteinG, locale), carbs: log.carbsG == null ? "—" : formatAmount(log.carbsG, locale), fat: log.fatG == null ? "—" : formatAmount(log.fatG, locale), fiber: log.fiberG == null ? "—" : formatAmount(log.fiberG, locale) })}</p></div>
      <button type="button" disabled={syncing} onClick={() => onDelete(log)} aria-label={t("mealTracker.deleteNamed", { name: log.name })} className="grid size-11 shrink-0 place-items-center disabled:opacity-50"><Trash2 size={18} /></button>
    </li>; })}</ul>}
  </section>;
}
