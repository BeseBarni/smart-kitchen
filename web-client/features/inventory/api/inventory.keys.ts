export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filters: object = {}) => [...inventoryKeys.lists(), filters] as const,
  summary: () => [...inventoryKeys.all, "summary"] as const,
  expiring: (withinHours: number) => [...inventoryKeys.all, "expiring", withinHours] as const,
  detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
};
