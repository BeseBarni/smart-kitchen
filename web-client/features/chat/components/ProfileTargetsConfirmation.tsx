"use client";

import type { NutritionTargetChanges } from "@app/modules/schemas";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMealLogMutations } from "@/features/meal-tracker";
import { useText, type TranslationKey } from "@/lib/i18n";

const fields = [
  ["dailyCalorieTarget", "nav.tracker", "kcal"],
  ["dailyProteinG", "recipes.protein", "g"],
  ["dailyCarbsG", "recipes.carbs", "g"],
  ["dailyFatG", "recipes.fat", "g"],
  ["dailyFiberG", "recipes.fiber", "g"],
] as const satisfies readonly (readonly [keyof NutritionTargetChanges, TranslationKey, string])[];

export function ProfileTargetsConfirmation({ targets, disabled }: {
  targets: NutritionTargetChanges; disabled: boolean;
}): React.JSX.Element {
  const { t, formatNumber } = useText();
  const { targets: mutation } = useMealLogMutations();
  const [applied, setApplied] = useState(false);
  const confirm = (): void => {
    setApplied(true);
    mutation.mutate(targets, {
      onError: () => setApplied(false),
    });
  };
  return <section aria-label={t("chat.confirmTargets")} className="space-y-2 rounded-xl border border-primary/20 bg-secondary p-3">
    <h2 className="text-title-sm">{t("chat.confirmTargets")}</h2>
    <ul className="text-body-sm tabular-nums">
      {fields.map(([key, label, unit]) => targets[key] === undefined ? null : <li key={key}>
        {t(label)}: {targets[key] === null ? t("chat.unset") : `${formatNumber(targets[key])} ${unit}`}
      </li>)}
    </ul>
    <Button type="button" className="min-h-11" disabled={disabled || mutation.isPending || applied} onClick={() => void confirm()}>
      {t(applied ? "chat.targetsDone" : "chat.confirmTargetsAction")}
    </Button>
  </section>;
}
