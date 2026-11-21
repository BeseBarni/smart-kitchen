import type { ShoppingItemDto, ShoppingItemInput } from "@app/modules/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { createOptimisticId } from "@/lib/optimistic";

export function insertOptimisticShopping(
  client: QueryClient,
  inputs: readonly ShoppingItemInput[],
): ShoppingItemDto[] {
  const now = new Date().toISOString();
  const items = inputs.map((input) => ({
    ...input,
    id: createOptimisticId(),
    createdAt: now,
    updatedAt: now,
  }));
  client.setQueryData<ShoppingItemDto[]>(["shopping"], (cached) =>
    cached ? [...items, ...cached] : items,
  );
  return items;
}

export function replaceOptimisticShopping(
  client: QueryClient,
  optimisticItems: readonly ShoppingItemDto[],
  canonicalItems: readonly ShoppingItemDto[],
): void {
  client.setQueryData<ShoppingItemDto[]>(["shopping"], (cached) => {
    if (!cached) return cached;
    return cached.map((item) => {
      const index = optimisticItems.findIndex((candidate) => candidate.id === item.id);
      return index >= 0 ? canonicalItems[index] ?? item : item;
    });
  });
}

export function removeOptimisticShopping(client: QueryClient, id: string): void {
  client.setQueryData<ShoppingItemDto[]>(["shopping"], (cached) =>
    cached?.filter((item) => item.id !== id),
  );
}
