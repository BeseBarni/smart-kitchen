// Provisional UI contracts until shared inventory DTOs are defined.
import type {
  CreateInventoryItemInput,
  InventoryItemDto,
  InventorySummaryDto,
  ListInventoryQuery,
  UpdateInventoryItemInput,
  InventoryDetailDto,
} from "@app/modules/schemas";

export type InventoryItem = InventoryItemDto;
export type InventoryInput = CreateInventoryItemInput;
export type InventoryUpdate = UpdateInventoryItemInput;
export type InventorySummary = InventorySummaryDto;
export type InventoryListFilters = Partial<ListInventoryQuery>;
export type Storage = InventoryItemDto["storageLocation"];
export type InventoryDetail = InventoryDetailDto;
