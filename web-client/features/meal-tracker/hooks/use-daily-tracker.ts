"use client";

import { useQuery } from "@tanstack/react-query";
import { mealTrackerApi } from "../api/meal-tracker.api";
import { mealTrackerKeys } from "../api/meal-tracker.keys";
import { toLocalDayRange } from "../utils/date.utils";

export function useDailyTracker(date: string) {
  const range = date ? toLocalDayRange(date) : { from: "", to: "" };
  const summary = useQuery({
    queryKey: mealTrackerKeys.dailySummary(date, range.from, range.to),
    queryFn: () => mealTrackerApi.summary(date, range),
    enabled: Boolean(date),
  });
  const logs = useQuery({
    queryKey: mealTrackerKeys.logs(date, range.from, range.to),
    queryFn: () => mealTrackerApi.logs(range),
    enabled: Boolean(date),
  });
  const profile = useQuery({ queryKey: mealTrackerKeys.profile(), queryFn: mealTrackerApi.profile });
  return { summary, logs, profile };
}
