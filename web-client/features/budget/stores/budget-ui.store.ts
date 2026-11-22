import { create } from "zustand";

export type BudgetSheet = "closed" | "create-manual" | "create-scanned" | "edit-receipt" | "budget-settings";

interface BudgetUi {
  selectedYearMonth: string;
  selectedCategoryId: string | null;
  selectedMerchantId: string | null;
  activeSheet: BudgetSheet;
  selectedReceiptId: string | null;
  editingReceiptId: string | null;
  deleteCandidate: { id: string; title: string; totalAmount: number; itemCount: number } | null;
  setYearMonth: (yearMonth: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  goToCurrentMonth: () => void;
  toggleCategory: (categoryId: string) => void;
  toggleMerchant: (merchantId: string) => void;
  clearFilters: () => void;
  openSheet: (sheet: BudgetSheet) => void;
  closeSheet: () => void;
  openReceipt: (id: string) => void;
  closeReceipt: () => void;
  setEditingReceipt: (id: string | null) => void;
  setDeleteCandidate: (candidate: BudgetUi["deleteCandidate"]) => void;
}

function currentYearMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(yearMonth: string, amount: number): string {
  const [year = 1970, month = 1] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const useBudgetUiStore = create<BudgetUi>((set) => ({
  selectedYearMonth: currentYearMonth(),
  selectedCategoryId: null,
  selectedMerchantId: null,
  activeSheet: "closed",
  selectedReceiptId: null,
  editingReceiptId: null,
  deleteCandidate: null,
  setYearMonth: (selectedYearMonth) => set({ selectedYearMonth }),
  prevMonth: () => set((state) => ({ selectedYearMonth: shiftMonth(state.selectedYearMonth, -1) })),
  nextMonth: () => set((state) => ({ selectedYearMonth: shiftMonth(state.selectedYearMonth, 1) })),
  goToCurrentMonth: () => set({ selectedYearMonth: currentYearMonth() }),
  toggleCategory: (categoryId) => set((state) => ({
    selectedCategoryId: state.selectedCategoryId === categoryId ? null : categoryId,
  })),
  toggleMerchant: (merchantId) => set((state) => ({
    selectedMerchantId: state.selectedMerchantId === merchantId ? null : merchantId,
  })),
  clearFilters: () => set({ selectedCategoryId: null, selectedMerchantId: null }),
  openSheet: (activeSheet) => set({ activeSheet }),
  closeSheet: () => set({ activeSheet: "closed", editingReceiptId: null }),
  openReceipt: (selectedReceiptId) => set({ selectedReceiptId }),
  closeReceipt: () => set({ selectedReceiptId: null }),
  setEditingReceipt: (editingReceiptId) => set({ editingReceiptId, activeSheet: editingReceiptId ? "edit-receipt" : "closed" }),
  setDeleteCandidate: (deleteCandidate) => set({ deleteCandidate }),
}));
