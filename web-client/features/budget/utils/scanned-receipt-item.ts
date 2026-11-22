import type { CommitScannedReceiptItem, ExtractedReceiptItemPreview } from "@app/modules/schemas";

type FormItem = {
  tempId?: string;
  name: string;
  categoryId: string;
  amount: number;
  quantity?: number;
  unit?: string;
};

export function scannedReceiptItem(
  item: FormItem,
  previewItems: ExtractedReceiptItemPreview[],
  stockItems: boolean,
): CommitScannedReceiptItem {
  const enriched = previewItems.find((entry) => entry.tempId === item.tempId);
  const sameName = enriched?.name === item.name;
  return {
    name: item.name,
    rawReceiptText: enriched?.rawReceiptText,
    categoryId: item.categoryId,
    amount: item.amount,
    quantity: item.quantity ?? 1,
    unit: item.unit,
    addToInventory: Boolean(enriched?.isFoodItem && stockItems),
    storageLocation: enriched?.storageLocation,
    shelfLifeDays: enriched?.shelfLifeDays,
    tags: enriched?.suggestedTags,
    estimatedMacrosPerUnit: sameName && enriched?.unit === item.unit ? enriched.estimatedMacrosPerUnit : undefined,
    stockImageKind: sameName ? enriched?.stockImageKind : undefined,
    stockImageName: sameName ? enriched?.stockImageName : undefined,
  };
}
