export const recipesKeys = {
  all: ["recipes"] as const,
  lists: () => [...recipesKeys.all, "list"] as const,
  list: (filters: object = {}) => [...recipesKeys.lists(), filters] as const,
  detail: (id: string) => [...recipesKeys.all, "detail", id] as const,
};
