import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { ConversationItemPayload } from "@app/db";

test("receipt import records confirmation once and rejects missing or non-receipt messages", async () => {
  const db = await import("@app/db");
  let allowed = true;
  let payload: ConversationItemPayload = {
    kind: "message", text: "Review", uiDirectives: [
      { component: "recommendation_chips" }, { component: "receipt_import_card" },
    ],
  };
  let inserted: unknown[] = [];
  let selectCount = 0;
  let failInsert = false;
  const tx = {
    select: () => ({ from: () => ({ where: () => ({
      for: () => ({ limit: async () => allowed ? [{ id: "conversation" }] : [] }),
      limit: async () => { selectCount++; return [{ payload }]; },
    }) }) }),
    insert: () => ({ values: async (values: unknown[]) => {
      if (failInsert) throw new Error("Insert failed");
      inserted.push(...values);
    } }),
    update: () => ({ set: (value: { payload: ConversationItemPayload }) => ({
      where: async () => { payload = value.payload; },
    }) }),
  };
  const moduleMock = mock.module("@app/db", {
    namedExports: { ...db, getDatabase: () => ({ transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) }) },
  });
  try {
    const { importReceiptRows } = await import("./chat.repo");
    const input = { items: [{ name: "Apple", quantity: 1, unit: "piece", storageLocation: "fridge" as const }] };
    assert.equal(await importReceiptRows("user", "conversation", "message", 0, input), false);
    assert.equal(await importReceiptRows("user", "conversation", "message", 2, input), false);
    assert.equal(inserted.length, 0);
    failInsert = true;
    await assert.rejects(importReceiptRows("user", "conversation", "message", 1, input), /Insert failed/);
    assert.equal(payload.kind, "message");
    if (payload.kind === "message") assert.equal(payload.importedReceiptIndexes, undefined);
    failInsert = false;
    assert.equal(await importReceiptRows("user", "conversation", "message", 1, input), true);
    assert.equal(inserted.length, 1);
    assert.equal(payload.kind, "message");
    if (payload.kind === "message") assert.deepEqual(payload.importedReceiptIndexes, [1]);
    assert.equal(await importReceiptRows("user", "conversation", "message", 1, input), true);
    assert.equal(inserted.length, 1);
    allowed = false;
    const before = selectCount;
    assert.equal(await importReceiptRows("other-user", "conversation", "message", 1, input), false);
    assert.equal(selectCount, before);
  } finally {
    moduleMock.restore();
  }
});
