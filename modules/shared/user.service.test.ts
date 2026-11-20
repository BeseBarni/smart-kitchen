import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { closeDatabase } from "@app/db";
import { createConversation, deleteConversation } from "../chat/chat.service";

const userId = process.env.AI_SMOKE_TEST_USER_ID;
const skip = !process.env.DATABASE_URL || !userId
  ? "Requires DATABASE_URL and AI_SMOKE_TEST_USER_ID for a disposable database."
  : false;

after(async () => {
  await closeDatabase();
});

test("an existing Neon Auth user can create a conversation", { skip }, async () => {
  assert.ok(userId);
  const result = await createConversation(userId, { title: "Auth user integration test" });
  assert.equal(result.success, true);
  if (result.success) {
    const deleted = await deleteConversation(userId, result.data.id);
    assert.equal(deleted.success, true);
  }
});

test("a missing Neon Auth user is rejected without creating a conversation", { skip }, async () => {
  const result = await createConversation(randomUUID());
  assert.deepEqual(result, {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Authenticated user no longer exists." },
  });
});
