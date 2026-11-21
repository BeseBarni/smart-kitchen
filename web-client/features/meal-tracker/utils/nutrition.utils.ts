import type { MealLogDto } from "@app/modules/schemas";
import { formatLocaleNumber } from "../../../lib/i18n/orchestrator";
import type { SupportedLocale } from "../../../lib/i18n/types";

export type MealGroup = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export function percentage(value: number, target: number | null): number | null {
  if (target === null || target <= 0) return null;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

export function groupMeals(logs: MealLogDto[]): Record<MealGroup, MealLogDto[]> {
  const groups: Record<MealGroup, MealLogDto[]> = { breakfast: [], lunch: [], dinner: [], snack: [], other: [] };
  for (const log of logs) groups[log.mealType ?? "other"].push(log);
  return groups;
}

export function formatAmount(value: number, locale: SupportedLocale = "en"): string {
  return formatLocaleNumber(locale, value, { maximumFractionDigits: 1 });
}
