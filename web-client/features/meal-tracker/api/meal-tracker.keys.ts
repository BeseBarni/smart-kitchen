export const mealTrackerKeys = {
  all: ["meal-tracker"] as const,
  dailySummary: (date: string, from: string, to: string) =>
    [...mealTrackerKeys.all, "summary", date, from, to] as const,
  logs: (date: string, from: string, to: string) =>
    [...mealTrackerKeys.all, "logs", date, from, to] as const,
  profile: () => [...mealTrackerKeys.all, "profile"] as const,
  suggestions: () => [...mealTrackerKeys.all, "suggestions"] as const,
};
