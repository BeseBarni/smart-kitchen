"use client";

import type { NutritionTargetChanges } from "@app/modules/schemas";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMealLogMutations } from "@/features/meal-tracker";

const fields = [
  ["dailyCalorieTarget", "Calories", "kcal"],
  ["dailyProteinG", "Protein", "g"],
  ["dailyCarbsG", "Carbs", "g"],
  ["dailyFatG", "Fat", "g"],
  ["dailyFiberG", "Fiber", "g"],
] as const;

export function ProfileTargetsConfirmation({ targets, disabled }: {
  targets: NutritionTargetChanges; disabled: boolean;
}): React.JSX.Element {
  const { targets: mutation } = useMealLogMutations();
  const [applied, setApplied] = useState(false);
  const confirm = async (): Promise<void> => {
    try { await mutation.mutateAsync(targets); setApplied(true); }
    catch { /* The mutation reports the error and the user can retry. */ }
  };
  return <section aria-label="Confirm daily targets" className="space-y-2 rounded-xl border border-primary/20 bg-secondary p-3">
    <h2 className="text-title-sm">Confirm daily targets</h2>
    <ul className="text-body-sm tabular-nums">
      {fields.map(([key, label, unit]) => targets[key] === undefined ? null : <li key={key}>
        {label}: {targets[key] === null ? "Unset" : `${targets[key]} ${unit}`}
      </li>)}
    </ul>
    <Button type="button" className="min-h-11" disabled={disabled || mutation.isPending || applied} onClick={() => void confirm()}>
      {applied ? "Targets updated" : "Confirm and update targets"}
    </Button>
  </section>;
}
