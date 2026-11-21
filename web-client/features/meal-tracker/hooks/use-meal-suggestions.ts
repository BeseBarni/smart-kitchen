"use client";

import { useQuery } from "@tanstack/react-query";
import { mealTrackerApi } from "../api/meal-tracker.api";
import { mealTrackerKeys } from "../api/meal-tracker.keys";
import { localDate, toLocalDayRange } from "../utils/date.utils";

export function useMealSuggestions(date: string) {
  const enabled = Boolean(date) && date === localDate();
  const range = date ? toLocalDayRange(date) : { from: "", to: "" };
  return useQuery({
    queryKey: [...mealTrackerKeys.suggestions(), date, range.from, range.to],
    queryFn: () => mealTrackerApi.suggestions(date, range),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
