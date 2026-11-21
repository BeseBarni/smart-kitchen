import assert from "node:assert/strict";
import test from "node:test";
import { batchCreateInventoryInputSchema } from "@app/modules/schemas";
import { receiptBatchInput } from "./receipt-import";
import type { UiDirective } from "../types";

test("selected receipt items carry estimates through the batch API, including unknown values", () => {
  const macros = { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null };
  const item = {
    tempId: "1", name: "Apple", quantity: 500, unit: "g", priceAmount: 0.01,
    storageLocation: "fridge" as const, estimatedShelfLifeDays: null, isFoodItem: true,
    confidence: "high" as const, estimatedMacrosPerUnit: macros,
  };
  const directive: Extract<UiDirective, { component: "receipt_import_card" }> = {
    component: "receipt_import_card", merchant: null, purchasedAt: null,
    currency: "USD", totalAmount: null, items: [item],
  };
  const result = receiptBatchInput(directive, [
    { ...item, selected: true },
    { ...item, tempId: "2", selected: false },
  ]);
  assert.equal(result.items.length, 1);
  assert.deepEqual(batchCreateInventoryInputSchema.parse(result).items[0]?.estimatedMacrosPerUnit, macros);
});
