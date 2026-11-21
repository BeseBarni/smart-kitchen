"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { inventoryApi, inventoryKeys } from "@/features/inventory";

export function useStockItems() {
  return useInfiniteQuery({
    queryKey: [...inventoryKeys.all, "tracker-stock"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => inventoryApi.list({ status: "in_stock", limit: 100, offset: pageParam }),
    getNextPageParam: (last, pages) => last.length === 100 ? pages.length * 100 : undefined,
  });
}
