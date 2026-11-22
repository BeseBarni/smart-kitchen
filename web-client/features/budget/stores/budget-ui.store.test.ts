import assert from "node:assert/strict";
import test from "node:test";
import { useBudgetUiStore } from "./budget-ui.store";

test("budget month navigation wraps across year boundaries", () => {
  const store = useBudgetUiStore.getState();
  store.setYearMonth("2026-01");
  store.prevMonth();
  assert.equal(useBudgetUiStore.getState().selectedYearMonth, "2025-12");
  store.nextMonth();
  assert.equal(useBudgetUiStore.getState().selectedYearMonth, "2026-01");
});

test("category and merchant filters compose and clear", () => {
  const store = useBudgetUiStore.getState();
  store.clearFilters();
  store.toggleCategory("category-1");
  store.toggleMerchant("merchant-1");
  const state = useBudgetUiStore.getState();
  assert.equal(state.selectedCategoryId, "category-1");
  assert.equal(state.selectedMerchantId, "merchant-1");
  state.clearFilters();
  assert.equal(useBudgetUiStore.getState().selectedCategoryId, null);
  assert.equal(useBudgetUiStore.getState().selectedMerchantId, null);
});
