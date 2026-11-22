import type { AppDomain } from "@app/shared";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { inventoryKeys } from "@/features/inventory";
import { recipesKeys } from "@/features/recipes";
import { mealTrackerKeys } from "@/features/meal-tracker";
import { budgetKeys } from "@/features/budget";

export type BudgetAppDomain = AppDomain | "budget" | "receipts" | "merchants";
export async function invalidateAppDomains(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  domains: readonly BudgetAppDomain[],
): Promise<void> {
  const domainKeys: Record<BudgetAppDomain, QueryKey[]> = {
    inventory: [inventoryKeys.all, mealTrackerKeys.suggestions()],
    recipes: [recipesKeys.all],
    ingredients: [["ingredients"]],
    "meal-logs": [["meal-logs"], mealTrackerKeys.all],
    profile: [["profile"], mealTrackerKeys.all],
    budget: [budgetKeys.all],
    receipts: [budgetKeys.all, ["receipt-import"]],
    merchants: [budgetKeys.merchants()],
  };
  const keys = [...new Map(domains.flatMap((domain) => domainKeys[domain]).map((key) => [JSON.stringify(key), key])).values()];
  const roots = keys.filter((key) => !keys.some((other) =>
    other.length < key.length && other.every((part, index) => JSON.stringify(part) === JSON.stringify(key[index])),
  ));
  await Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
