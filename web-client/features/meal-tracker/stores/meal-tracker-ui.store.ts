import { create } from "zustand";
import { addLocalDays, localDate } from "../utils/date.utils";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
interface TrackerUi {
  selectedDate: string;
  activeLogSheet: "closed" | "from-inventory" | "manual";
  preselectedMealType: MealType | null;
  isTargetsSheetOpen: boolean;
  deleteCandidate: { id: string; name: string; hasInventoryLink: boolean } | null;
  setDate: (date: string) => void;
  prevDay: () => void;
  nextDay: () => void;
  goToToday: () => void;
  openLog: (sheet: "from-inventory" | "manual", mealType?: MealType) => void;
  closeLog: () => void;
  setTargetsOpen: (open: boolean) => void;
  setDeleteCandidate: (candidate: TrackerUi["deleteCandidate"]) => void;
}

export const useMealTrackerUiStore = create<TrackerUi>((set) => ({
  selectedDate: "",
  activeLogSheet: "closed",
  preselectedMealType: null,
  isTargetsSheetOpen: false,
  deleteCandidate: null,
  setDate: (selectedDate) => set({ selectedDate }),
  prevDay: () => set((state) => ({ selectedDate: addLocalDays(state.selectedDate || localDate(), -1) })),
  nextDay: () => set((state) => ({ selectedDate: addLocalDays(state.selectedDate || localDate(), 1) })),
  goToToday: () => set({ selectedDate: localDate() }),
  openLog: (activeLogSheet, mealType) => set({ activeLogSheet, preselectedMealType: mealType ?? null }),
  closeLog: () => set({ activeLogSheet: "closed", preselectedMealType: null }),
  setTargetsOpen: (isTargetsSheetOpen) => set({ isTargetsSheetOpen }),
  setDeleteCandidate: (deleteCandidate) => set({ deleteCandidate }),
}));
