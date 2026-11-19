import { create } from "zustand";
import type { RecipeFilter } from "../types";

interface RecipesUiState {
  search: string;
  filter: RecipeFilter;
  setSearch: (search: string) => void;
  setFilter: (filter: RecipeFilter) => void;
}

export const useRecipesUiStore = create<RecipesUiState>((set) => ({
  search: "",
  filter: "all",
  setSearch: (search) => set({ search }),
  setFilter: (filter) => set({ filter }),
}));
