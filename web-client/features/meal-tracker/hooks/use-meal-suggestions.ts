"use client";

import { useQuery } from "@tanstack/react-query";
import { mealTrackerApi } from "../api/meal-tracker.api";
import { mealTrackerKeys } from "../api/meal-tracker.keys";
import { localDate, toLocalDayRange } from "../utils/date.utils";
import { useLanguageStore } from "@/lib/i18n";

export function useMealSuggestions(date: string) {
  const locale = useLanguageStore((state) => state.locale);
  const enabled = Boolean(date) && date === localDate();
  const range = date ? toLocalDayRange(date) : { from: "", to: "" };
  return useQuery({
    queryKey: [...mealTrackerKeys.suggestions(), locale, date, range.from, range.to],
    queryFn: () => mealTrackerApi.suggestions(date, range, locale),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
