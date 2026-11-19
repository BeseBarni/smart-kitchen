import assert from "node:assert/strict";
import { test } from "node:test";
import { conversationItemSchema } from "./chat.schema";

const item = {
  id: "00000000-0000-4000-8000-000000000001",
  conversationId: "00000000-0000-4000-8000-000000000002",
  sequence: 0,
  type: "message",
  role: "user",
  callId: null,
  toolName: null,
  payload: { kind: "message", text: "Hello" },
  metadata: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("conversation item accepts matching type and payload discriminators", () => {
  assert.equal(conversationItemSchema.safeParse(item).success, true);
});

test("conversation item rejects mismatched type and payload discriminators", () => {
  assert.equal(
    conversationItemSchema.safeParse({
      ...item,
      payload: { kind: "tool_call", arguments: {} },
    }).success,
    false,
  );
});
