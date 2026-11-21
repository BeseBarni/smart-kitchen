import { create } from "zustand";
import type { StorageFilter } from "../utils/inventory-selectors";

interface InventoryUiState {
  filter: StorageFilter;
  search: string;
  searchOpen: boolean;
  sheet: "closed" | "add" | "edit";
  selectedId: string | null;
  selectedItemId: string | null;
  setFilter: (filter: StorageFilter) => void;
  setSearch: (search: string) => void;
  setSearchOpen: (open: boolean) => void;
  openAdd: () => void;
  openEdit: (id: string) => void;
  closeSheet: () => void;
  openItemDetail: (id: string) => void;
  closeItemDetail: () => void;
}

export const useInventoryUiStore = create<InventoryUiState>((set) => ({
  filter: "all",
  search: "",
  searchOpen: false,
  sheet: "closed",
  selectedId: null,
  selectedItemId: null,
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openAdd: () => set({ sheet: "add", selectedId: null }),
  openEdit: (selectedId) => set({ sheet: "edit", selectedId }),
  closeSheet: () => set({ sheet: "closed", selectedId: null }),
  openItemDetail: (selectedItemId) => set({ selectedItemId }),
  closeItemDetail: () => set({ selectedItemId: null }),
}));
