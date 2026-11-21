import assert from "node:assert/strict";
import test from "node:test";
import { useInventoryUiStore } from "./inventory-ui.store";

test("opens and closes the item detail modal", () => {
  useInventoryUiStore.setState({ selectedItemId: null });
  useInventoryUiStore.getState().openItemDetail("item-1");
  assert.equal(useInventoryUiStore.getState().selectedItemId, "item-1");
  useInventoryUiStore.getState().closeItemDetail();
  assert.equal(useInventoryUiStore.getState().selectedItemId, null);
});
