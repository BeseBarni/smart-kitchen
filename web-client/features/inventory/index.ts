export { InventoryView } from "./components/InventoryView";
export { inventoryKeys } from "./api/inventory.keys";
export { inventoryApi } from "./api/inventory.api";
export { useExpiringInventory, useInventory, useInventoryMutations, useInventorySummary } from "./hooks/use-inventory";
export type { InventoryInput, InventoryItem, InventoryListFilters, InventorySummary, InventoryUpdate } from "./types";
export { consumeOptimisticInventory, replaceOptimisticInventory, replaceOptimisticMealLog } from "./utils/inventory-cache.utils";
export { ItemDetailModal } from "./components/detail/ItemDetailModal";
export { useInventoryDetail } from "./hooks/use-inventory-detail";
export { useSwitchStorage } from "./hooks/use-switch-storage";
