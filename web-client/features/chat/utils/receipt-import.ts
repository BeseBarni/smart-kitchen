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
      costPerUnit: item.priceAmount,
      currency: directive.currency,
      estimatedMacrosPerUnit: item.estimatedMacrosPerUnit,
    })),
  };
}
