export type Storage = "fridge" | "freezer";
export type Container = "glass" | "bag" | "box";

export interface InventoryInput {
  name: string;
  storage: Storage;
  portions: number;
  bestBefore: string;
  container: Container;
  location: string;
}

export interface InventoryItem extends InventoryInput {
  id: string;
}

export interface PortionAdjustment {
  id: string;
  delta: 1 | -1;
}
