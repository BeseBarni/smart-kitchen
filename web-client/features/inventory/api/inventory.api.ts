import * as mock from "../mocks/inventory.mock";
import type { InventoryInput, InventoryItem, PortionAdjustment } from "../types";

export const inventoryApi = {
  list: (): Promise<InventoryItem[]> => mock.listInventory(),
  create: (input: InventoryInput): Promise<InventoryItem> => mock.createInventory(input),
  update: (id: string, input: InventoryInput): Promise<InventoryItem> => mock.updateInventory(id, input),
  adjust: (input: PortionAdjustment): Promise<void> => mock.adjustPortions(input),
};
