import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("scanned receipt merchant validation uses the receipt transaction", async () => {
  const actualDb = await import("@app/db");
  let inTransaction = false;
  let transactionCategoryReads = 0;
  const categoryId = "category";
  const select = (transactional: boolean) => ({
    from: () => ({
      where: () => {
        assert.ok(!inTransaction || transactional, "transaction must not wait for the pool");
        if (transactional) transactionCategoryReads += 1;
        return Promise.resolve([{ id: categoryId }]);
      },
    }),
  });
  const tx = {
    select: () => select(true),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: "merchant" }],
        }),
      }),
    }),
  };
  const dbMock = mock.module("@app/db", {
    namedExports: {
      ...actualDb,
      db: { select: () => select(false) },
    },
  });
  const repoMock = mock.module("./receipts-write.repo", {
    namedExports: {
      assertLinkedRecordsOwned: async () => ({ success: true, data: true }),
      withReceiptTransaction: async (userId: string, operation: (userId: string, tx: object) => Promise<unknown>) => {
        inTransaction = true;
        try {
          return await operation(userId, tx);
        } finally {
          inTransaction = false;
        }
      },
      insertReceiptRow: async () => ({ success: true, data: { id: "receipt" } }),
      replaceReceiptItems: async () => ({ success: true, data: true }),
      insertScannedInventoryRows: async () => ({ success: true, data: [{ item: { id: "inventory" }, index: 0 }] }),
      insertScannedReceiptItems: async () => ({ success: true, data: true }),
      updateReceiptRow: async () => ({ success: true, data: undefined }),
      removeReceiptRow: async () => ({ success: true, data: false }),
    },
  });
  const readsMock = mock.module("./receipts-read.service", {
    namedExports: { getReceiptDetail: async () => ({ success: true, data: { id: "receipt" } }) },
  });
  const inventoryMock = mock.module("../inventory/inventory.service", {
    namedExports: { list: async () => ({ success: true, data: [{ id: "inventory" }] }) },
  });
  try {
    const { commitScannedReceipt } = await import("./receipts-write.service");
    const result = await commitScannedReceipt("owner", {
      merchantName: "Store",
      purchasedAt: "2026-01-03T11:00:00.000Z",
      currency: "HUF",
      items: [{
        name: "Milk",
        categoryId,
        amount: 10,
        quantity: 1,
        addToInventory: true,
        storageLocation: "fridge",
      }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.receipt.id, "receipt");
      assert.deepEqual(result.data.createdInventoryItems.map((item) => item.id), ["inventory"]);
    }
    assert.equal(transactionCategoryReads, 1);
  } finally {
    inventoryMock.restore();
    readsMock.restore();
    repoMock.restore();
    dbMock.restore();
  }
});
