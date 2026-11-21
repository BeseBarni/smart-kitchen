import type { BatchCreateInventoryInput } from "@app/modules/schemas";
import type { UiDirective } from "../types";

type ReceiptDirective = Extract<UiDirective, { component: "receipt_import_card" }>;

export function receiptBatchInput(
  directive: ReceiptDirective,
  items: Array<ReceiptDirective["items"][number] & { selected: boolean }>,
): BatchCreateInventoryInput {
  return {
    items: items.filter((item) => item.selected).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      storageLocation: item.storageLocation,
      expiresAt: item.expiresAt,
      costPerUnit: item.priceAmount,
      currency: directive.currency,
      estimatedMacrosPerUnit: item.estimatedMacrosPerUnit,
      shelfLifeDays: item.shelfLifeDays ?? (
        item.storageLocation === directive.items.find((entry) => entry.tempId === item.tempId)?.storageLocation &&
        item.estimatedShelfLifeDays != null && Number.isInteger(item.estimatedShelfLifeDays)
          ? { [item.storageLocation]: item.estimatedShelfLifeDays }
          : undefined
      ),
    })),
  };
}
