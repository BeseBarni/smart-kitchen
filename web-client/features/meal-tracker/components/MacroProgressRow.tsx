import { formatAmount, percentage } from "../utils/nutrition.utils";

type Macro = { label: string; value: number; target: number | null; incomplete?: boolean };
export function MacroProgressRow({ macros }: { macros: Macro[] }): React.JSX.Element {
  return <section aria-label="Nutrition progress" className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 shadow-sm">
    {macros.map(({ label, value, target, incomplete }) => {
      const progress = percentage(value, target);
      return <div key={label} className="rounded-lg bg-stitch-surface-container-low p-2">
        <div className="flex justify-between gap-1 text-label-sm"><span>{label}</span><span className="tabular-nums">{progress === null ? "—" : `${Math.round(value / (target ?? 1) * 100)}%`}</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stitch-surface-container"><div className="h-full rounded-full bg-stitch-primary" style={{ width: `${progress ?? 0}%` }} /></div>
        <p className="mt-1 text-label-md tabular-nums">{formatAmount(value)} / {target === null ? "—" : formatAmount(target)} g{incomplete ? " (incomplete)" : ""}</p>
        {label === "Fiber" && <p className="text-label-sm">May include estimates</p>}
      </div>;
    })}
  </section>;
}
