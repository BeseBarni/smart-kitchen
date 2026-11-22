import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { budgetApi } from "../api/budget.api";
import { budgetKeys } from "../api/budget.keys";

export function useRecommendedMerchants() {
  const [search, setSearch] = useState("");
  const params = useMemo(() => ({
    q: search.trim() || undefined,
    sort: "recommended" as const,
    limit: 12,
  }), [search]);
  const query = useQuery({
    queryKey: budgetKeys.merchants(params),
    queryFn: () => budgetApi.merchants(params),
  });
  return { search, setSearch, merchants: query.data ?? [], isPending: query.isPending, isError: query.isError };
}
