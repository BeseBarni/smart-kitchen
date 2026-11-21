"use client";

import { InventoryActionCard } from "./InventoryActionCard";
import { RecipeSuggestionCard } from "./RecipeSuggestionCard";
import type { UiDirective } from "../types";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ProfileTargetsConfirmation } from "./ProfileTargetsConfirmation";
import { useText } from "@/lib/i18n";

export function UiDirectiveRenderer({
  directive,
  onReply,
  disabled,
  recipeResponse,
}: {
  directive: UiDirective;
  onReply: (message: string) => void;
  disabled: boolean;
  recipeResponse: string;
}): React.JSX.Element {
  const { t, formatDate, formatNumber } = useText();
  if (directive.component === "profile_targets_updated") {
    return <p className="rounded-xl bg-secondary p-3 text-body-sm">{t("chat.targetsUpdated")}</p>;
  }
  if (directive.component === "profile_targets_confirmation") {
    return <ProfileTargetsConfirmation targets={directive.targets} disabled={disabled} />;
  }
  if (directive.component === "recommendation_chips") {
    return (
      <div aria-label={t("chat.suggestedReplies")} className="flex flex-wrap gap-2">
        {directive.recommendations.map((recommendation, index) => (
          <button key={`${index}-${recommendation}`} type="button" disabled={disabled} onClick={() => onReply(recommendation)}
            className="min-h-11 rounded-full border border-border bg-card px-3 text-label-md text-foreground disabled:opacity-50">
            {recommendation}
          </button>
        ))}
      </div>
    );
  }
  if (directive.component === "inventory_action_card") {
    return <InventoryActionCard {...directive} />;
  }
  if (directive.component === "recipe_preview_card") {
    return <RecipeSuggestionCard {...directive} assistantResponse={recipeResponse} />;
  }
  if (directive.component === "expiring_rescue_card") {
    return (
      <section aria-label={t("chat.rescueSuggestions")} className="space-y-3 rounded-xl border border-border bg-card p-3.5">
        <h2 className="text-title-sm">{t("chat.useSoon")}</h2>
        <ul className="space-y-2">
          {directive.expiringItems.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-body-sm">
              <span>{item.name} · {formatNumber(item.quantity)} {item.unit}</span>
              {item.expiresAt && <time dateTime={item.expiresAt} className="shrink-0 text-muted-foreground">{formatDate(new Date(item.expiresAt))}</time>}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          {directive.rescueOptions.map((option) => (
            <div key={option.title} className="flex flex-col gap-2 rounded-lg bg-muted p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-label-lg">{option.title}</h3>
                <p className="text-label-md text-muted-foreground">{t("chat.uses", { count: formatNumber(option.prepTimeMin), items: option.usesExpiringItems.join(", ") })}</p>
              </div>
              <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={() => onReply(t("chat.explorePrompt", { name: option.title, items: option.usesExpiringItems.join(", ") }))}>{t("chat.explore")}</Button>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (directive.component === "consumption_summary_card") {
    const meal = directive.loggedMeal;
    return (
      <section aria-label={t("chat.loggedMeal")} className="space-y-2 rounded-xl border border-primary/20 bg-secondary p-3.5">
        <h2 className="text-title-sm">{t("chat.mealLogged", { name: meal.name })}</h2>
        <p className="text-body-sm">{formatNumber(meal.quantity)} {meal.unit}</p>
        <p className="text-label-md text-muted-foreground">
          {t("chat.mealNutrition", { calories: meal.calories == null ? "—" : formatNumber(meal.calories), protein: meal.proteinG == null ? "—" : formatNumber(meal.proteinG), carbs: meal.carbsG == null ? "—" : formatNumber(meal.carbsG), fat: meal.fatG == null ? "—" : formatNumber(meal.fatG), fiber: meal.fiberG == null ? "—" : formatNumber(meal.fiberG) })}
        </p>
        {directive.dailyTotals && <p className="text-label-md text-muted-foreground">{t("chat.todayCalories", { count: formatNumber(directive.dailyTotals.calories) })}</p>}
      </section>
    );
  }
  return (
    <section aria-label={t("chat.confirmAction")} className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3.5">
      <h2 className="text-title-sm">{directive.title}</h2>
      <MarkdownContent text={directive.description} className="text-body-sm" />
      <Button
        type="button"
        className="h-11"
        onClick={() => onReply(t("chat.confirmPrompt", { id: directive.actionId, title: directive.title, description: directive.description }))}
      >
        {directive.confirmLabel}
      </Button>
    </section>
  );
}
