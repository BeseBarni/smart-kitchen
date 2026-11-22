"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { unwrapApiResponse } from "@/lib/api-client";

const candidateSchema = z.object({
  label: z.string(),
  stockImageKind: z.enum(["themealdb_meal", "themealdb_ingredient"]),
  stockImageName: z.string(),
  previewUrl: z.string().url(),
});

export type MealDbCandidate = z.infer<typeof candidateSchema>;

export function useMealDbImageSearch(
  kind: "meal" | "ingredient",
  query: string,
): { candidates: MealDbCandidate[]; isLoading: boolean; error: Error | null } {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  const search = useQuery({
    queryKey: ["mealdb", "images", kind, debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({ kind, q: debounced, limit: "6" });
      const response = await fetch(`/api/mealdb/images/search?${params.toString()}`, {
        credentials: "include",
      });
      return unwrapApiResponse(response, z.array(candidateSchema));
    },
  });
  return {
    candidates: search.data ?? [],
    isLoading: search.isLoading,
    error: search.error,
  };
}
