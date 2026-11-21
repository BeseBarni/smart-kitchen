import { formatAmount, percentage } from "../utils/nutrition.utils";

export function CalorieHeroCard({ calories, target, incomplete, onEdit }: { calories: number; target: number | null; incomplete: boolean; onEdit: () => void }): React.JSX.Element {
  const progress = percentage(calories, target);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  return (
    <section className="space-y-3 rounded-xl bg-stitch-surface-container-lowest p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div><h2 className="text-label-sm uppercase text-stitch-on-surface-variant">Daily balance</h2><p className="text-title-sm">Target: {target === null ? "Not set" : `${formatAmount(target)} kcal`}</p></div>
        <button type="button" onClick={onEdit} className="min-h-11 rounded-lg px-3 text-label-md text-stitch-primary">Edit targets</button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0" role="img" aria-label={`${formatAmount(calories)} calories eaten${target === null ? ", no target set" : ` of ${target} calorie target`}`}>
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--stitch-surface-container)" strokeWidth="9" />
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--stitch-primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - (progress ?? 0) / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="tabular-nums">{formatAmount(calories)}</strong><span className="text-label-sm">kcal eaten</span></div>
        </div>
        <div className="flex-1 rounded-lg bg-stitch-surface-container-low p-3">
          {incomplete ? <p className="text-body-sm">Calories are incomplete for some meals.</p> : target === null ? <p className="text-body-sm">Set your daily targets to see your progress.</p> : <><p className="text-label-sm">{calories > target ? "Over target" : "Remaining"}</p><p className="text-title-sm tabular-nums">{formatAmount(Math.abs(target - calories))} kcal</p></>}
        </div>
      </div>
    </section>
  );
}
