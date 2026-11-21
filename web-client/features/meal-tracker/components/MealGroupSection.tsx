"use client";

import type { MealLogDto } from "@app/modules/schemas";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount, type MealGroup } from "../utils/nutrition.utils";

export function MealGroupSection({ group, logs, onAdd, onDelete }: {
  group: MealGroup; logs: MealLogDto[];
  onAdd: () => void; onDelete: (log: MealLogDto) => void;
}): React.JSX.Element {
  const calories = logs.reduce((sum, log) => sum + (log.calories ?? 0), 0);
  return <section className="rounded-xl bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between"><h3 className="text-title-sm capitalize">{group}</h3><div className="flex items-center"><span className="tabular-nums text-label-md">{formatAmount(calories)} kcal{logs.some((log) => log.calories === null) ? " (incomplete)" : ""}</span>{group !== "other" && <button type="button" onClick={onAdd} aria-label={`Add ${group}`} className="grid size-11 place-items-center text-stitch-primary"><Plus size={20} /></button>}</div></div>
    {logs.length === 0 ? <p className="text-body-sm text-stitch-on-surface-variant">No meals logged.</p> : <ul>{logs.map((log) => <li key={log.id} className="flex items-center justify-between gap-2 border-t border-stitch-surface-container py-1">
      <div className="min-w-0"><p className="text-title-sm">{log.name}</p><p className="text-label-md tabular-nums">{formatAmount(log.quantity)} {log.unit} · {new Date(log.eatenAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p><p className="text-label-sm tabular-nums">P: {log.proteinG ?? "—"} · C: {log.carbsG ?? "—"} · F: {log.fatG ?? "—"} · Fiber: {log.fiberG ?? "—"} g (may include an estimate)</p></div>
      <button type="button" onClick={() => onDelete(log)} aria-label={`Delete ${log.name}`} className="grid size-11 shrink-0 place-items-center"><Trash2 size={18} /></button>
    </li>)}</ul>}
  </section>;
}
