import type { AppDomain } from "@app/shared";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { inventoryKeys } from "@/features/inventory";
import { recipesKeys } from "@/features/recipes";

const domainKeys: Record<AppDomain, QueryKey> = {
  inventory: inventoryKeys.all,
  recipes: recipesKeys.all,
  ingredients: ["ingredients"],
  "meal-logs": ["meal-logs"],
  profile: ["profile"],
};

export async function invalidateAppDomains(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  domains: readonly AppDomain[],
): Promise<void> {
  await Promise.all(
    [...new Set(domains)].map((domain) =>
      queryClient.invalidateQueries({ queryKey: domainKeys[domain] }),
    ),
  );
}
