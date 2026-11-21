"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addLocalDays, dateLabel } from "../utils/date.utils";

export function DateSwitcher({ date, onChange }: { date: string; onChange: (date: string) => void }): React.JSX.Element {
  const selected = new Date(`${date}T12:00:00`);
  const offset = (selected.getDay() + 6) % 7;
  const days = Array.from({ length: 7 }, (_, index) => addLocalDays(date, index - offset));
  return (
    <section aria-label="Select day" className="space-y-2 rounded-xl bg-stitch-surface-container-lowest p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" className="grid size-11 place-items-center" aria-label="Previous day" onClick={() => onChange(addLocalDays(date, -1))}><ChevronLeft /></button>
        <div className="text-center"><h1 className="text-title-sm">{dateLabel(date)}</h1><p className="text-label-md text-stitch-on-surface-variant">{selected.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div>
        <button type="button" className="grid size-11 place-items-center" aria-label="Next day" onClick={() => onChange(addLocalDays(date, 1))}><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const value = new Date(`${day}T12:00:00`);
          return <button type="button" key={day} aria-pressed={day === date} onClick={() => onChange(day)} className={`min-h-11 rounded-lg text-label-sm ${day === date ? "bg-stitch-primary text-white" : "text-stitch-on-surface-variant"}`}><span className="block">{value.toLocaleDateString(undefined, { weekday: "narrow" })}</span><span className="tabular-nums">{value.getDate()}</span></button>;
        })}
      </div>
    </section>
  );
}
