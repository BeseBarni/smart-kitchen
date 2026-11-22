import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExtractedReceiptItemPreview } from "@app/modules/schemas";
import { commitScannedReceiptItemSchema } from "@app/modules/schemas";
import { scannedReceiptItem } from "./scanned-receipt-item";

test("receipt form retains the right estimates after deleting or editing lines", () => {
  const macros = { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null };
  const apple: ExtractedReceiptItemPreview = {
    tempId: "apple", rawReceiptText: "APPLE", name: "Apple", quantity: 500, unit: "g",
    amount: 10, categoryId: "00000000-0000-4000-8000-000000000001", categorySlug: "food",
    isFoodItem: true, addToInventory: true, storageLocation: "fridge", estimatedShelfLifeDays: 7,
    shelfLifeDays: {}, suggestedTags: [], estimatedMacrosPerUnit: macros,
    stockImageKind: "themealdb_ingredient", stockImageName: "apple", confidence: "high",
  };
  const milk = { ...apple, tempId: "milk", name: "Milk", unit: "l", estimatedMacrosPerUnit: null };
  const previews = [milk, apple];
  const item = { tempId: "apple", name: "Apple", categoryId: apple.categoryId, amount: 10, quantity: 400, unit: "g" };
  const result = commitScannedReceiptItemSchema.parse(scannedReceiptItem(item, previews, true));
  assert.deepEqual(result.estimatedMacrosPerUnit, macros);
  assert.equal(result.stockImageName, "apple");
  assert.equal(result.addToInventory, true);
  assert.equal(scannedReceiptItem({ ...item, unit: "kg" }, previews, true).estimatedMacrosPerUnit, undefined);
  const renamed = scannedReceiptItem({ ...item, name: "Pear" }, previews, true);
  assert.equal(renamed.estimatedMacrosPerUnit, undefined);
  assert.equal(renamed.stockImageName, undefined);
  assert.equal(scannedReceiptItem({ ...item, tempId: undefined }, previews, true).addToInventory, false);
});
