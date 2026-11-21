import assert from "node:assert/strict";
import { test } from "node:test";
import { conversationItemSchema, conversationStreamInputSchema } from "./chat.schema";

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

test("assistant messages accept JSON-safe UI directives for replay", () => {
  assert.equal(conversationItemSchema.safeParse({
    ...item,
    role: "assistant",
    payload: {
      kind: "message",
      text: "Added soup.",
      uiDirectives: [{
        component: "inventory_action_card",
        action: "added",
        items: [{ id: "item-1", name: "Soup", quantity: 2, unit: "portion", location: "freezer" }],
      }],
    },
  }).success, true);
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

test("chat stream accepts supported languages and rejects unsupported values", () => {
  for (const locale of ["en", "hu", "es"]) {
    assert.equal(conversationStreamInputSchema.parse({ message: "Soup", locale }).locale, locale);
  }
  assert.equal(conversationStreamInputSchema.safeParse({ message: "Soup", locale: "invalid" }).success, false);
  assert.equal(conversationStreamInputSchema.safeParse({ message: "Soup" }).success, true);
});
