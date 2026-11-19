export const recipesKeys = {
  all: ["recipes"] as const,
  list: () => [...recipesKeys.all, "list"] as const,
  favorite: () => [...recipesKeys.all, "favorite"] as const,
};
