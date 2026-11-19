import assert from "node:assert/strict";
import { test } from "node:test";
import { toClientHistory, toModelMessages } from "./chat.mapper";
import type { ConversationItemDto } from "./chat.schema";

const items: ConversationItemDto[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    conversationId: "20000000-0000-4000-8000-000000000001",
    sequence: 1,
    type: "message",
    role: "user",
    callId: null,
    toolName: null,
    payload: { kind: "message", text: "What can I cook?" },
    metadata: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    conversationId: "20000000-0000-4000-8000-000000000001",
    sequence: 2,
    type: "tool_call",
    role: "assistant",
    callId: "call-1",
    toolName: "search_recipes",
    payload: { kind: "tool_call", arguments: { query: "beans" } },
    metadata: null,
    createdAt: "2026-01-01T00:00:01.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    conversationId: "20000000-0000-4000-8000-000000000001",
    sequence: 3,
    type: "tool_result",
    role: "tool",
    callId: "call-1",
    toolName: "search_recipes",
    payload: { kind: "tool_result", result: { count: 1 } },
    metadata: null,
    createdAt: "2026-01-01T00:00:02.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    conversationId: "20000000-0000-4000-8000-000000000001",
    sequence: 4,
    type: "skill_execution",
    role: "assistant",
    callId: null,
    toolName: null,
    payload: { kind: "skill_execution", input: { servings: 2 }, output: { recipe: "Soup" } },
    metadata: null,
    createdAt: "2026-01-01T00:00:03.000Z",
  },
];

test("maps ledger messages and tool pairs into model history in sequence order", () => {
  const messages = toModelMessages(items);
  assert.equal(messages.length, 4);
  assert.deepEqual(messages[0], { role: "user", content: "What can I cook?" });
  assert.deepEqual(messages[1], {
    role: "assistant",
    content: [{
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "search_recipes",
      input: { query: "beans" },
    }],
  });
  assert.deepEqual(messages[2], {
    role: "tool",
    content: [{
      type: "tool-result",
      toolCallId: "call-1",
      toolName: "search_recipes",
      output: { type: "json", value: { count: 1 } },
    }],
  });
  assert.equal(messages[3]?.role, "assistant");
});

test("preserves structured items for client history rendering", () => {
  const history = toClientHistory(items);
  assert.equal(history.length, items.length);
  assert.equal(history[1]?.type, "tool_call");
  assert.equal(history[2]?.callId, "call-1");
  assert.equal(history[3]?.payload.kind, "skill_execution");
});

test("rejects tool ledger items without call metadata", () => {
  const toolCall = items[1];
  const toolResult = items[2];
  assert.ok(toolCall);
  assert.ok(toolResult);
  assert.throws(
    () => toModelMessages([{ ...toolCall, callId: null }]),
    /missing its call identifier or tool name/,
  );
  assert.throws(
    () => toModelMessages([{ ...toolResult, toolName: null }]),
    /missing its call identifier or tool name/,
  );
});
