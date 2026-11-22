import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("receipt writes accept owned chat attachments and receipt scans, but reject other media", async () => {
  const media = mock.module("../media/media.service", {
    namedExports: {
      assertOwnedUploadedAssets: async (userId: string, ids: string[], purpose?: string) => {
        const [id] = ids;
        const asset = id === "chat" ? { purpose: "chat_attachment" }
          : id === "scan" ? { purpose: "receipt_scan" }
          : id === "avatar" ? { purpose: "avatar" }
          : undefined;
        if (userId !== "owner" || !asset || (purpose && asset.purpose !== purpose)) {
          return { success: false, error: { code: "UNAUTHORIZED", message: "Media not accessible." } };
        }
        return { success: true, data: [asset] };
      },
    },
  });
  const categories = mock.module("./expense-categories.service", {
    namedExports: { assertCategoriesAccessible: async () => ({ success: true, data: true }) },
  });
  let writes = 0;
  const repo = mock.module("./receipts-write.repo", {
    namedExports: {
      assertLinkedRecordsOwned: async () => ({ success: true, data: true }),
      withReceiptTransaction: async (userId: string, operation: (userId: string, tx: object) => Promise<unknown>) => {
        writes += 1;
        return operation(userId, {});
      },
      insertReceiptRow: async () => ({ success: true, data: { id: "receipt" } }),
      replaceReceiptItems: async () => ({ success: true, data: true }),
      insertScannedInventoryRows: async () => ({ success: true, data: [] }),
      insertScannedReceiptItems: async () => ({ success: true, data: true }),
      updateReceiptRow: async () => ({ success: true, data: { id: "receipt" } }),
      removeReceiptRow: async () => ({ success: true, data: true }),
    },
  });
  const reads = mock.module("./receipts-read.service", {
    namedExports: { getReceiptDetail: async () => ({ success: true, data: { id: "receipt" } }) },
  });
  const inventory = mock.module("../inventory/inventory.service", {
    namedExports: { list: async () => ({ success: true, data: [] }) },
  });

  try {
    const service = await import("./receipts-write.service");
    const input = {
      purchasedAt: "2026-01-03T11:00:00.000Z",
      currency: "HUF",
      items: [{ name: "Milk", categoryId: "category", amount: 10, quantity: 1, addToInventory: false }],
    };
    for (const mediaAssetId of ["chat", "scan"]) {
      const result = await service.commitScannedReceipt("owner", { ...input, mediaAssetId });
      assert.equal(result.success, true);
    }
    assert.equal((await service.update("owner", "receipt", { mediaAssetId: "chat" })).success, true);
    const writesBeforeRejections = writes;
    for (const [userId, mediaAssetId] of [["owner", "avatar"], ["owner", "pending"], ["other", "chat"]]) {
      const result = await service.commitScannedReceipt(userId!, { ...input, mediaAssetId });
      assert.equal(result.success, false);
      if (!result.success) assert.equal(result.error.code, "UNAUTHORIZED");
    }
    assert.equal(writes, writesBeforeRejections);
  } finally {
    inventory.restore();
    reads.restore();
    repo.restore();
    categories.restore();
    media.restore();
  }
});
