import assert from "node:assert/strict";
import test from "node:test";
import type { ConversationItemDto } from "@app/modules/schemas";
import { mapConversationHistory } from "./chat-history.mapper";

const conversationId = "00000000-0000-4000-8000-000000000001";
const createdAt = "2026-01-01T10:00:00.000Z";

function item(input: Pick<ConversationItemDto, "sequence" | "type" | "role" | "payload"> & {
  callId?: string | null;
  toolName?: string | null;
}): ConversationItemDto {
  return {
    id: `00000000-0000-4000-8000-${String(input.sequence + 1).padStart(12, "0")}`,
    conversationId,
    sequence: input.sequence,
    type: input.type,
    role: input.role,
    callId: input.callId ?? null,
    toolName: input.toolName ?? null,
    payload: input.payload,
    metadata: null,
    createdAt,
  };
}

test("reconstructs persisted user, assistant, and tool activity", () => {
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Make soup" } }),
    item({
      sequence: 1,
      type: "tool_call",
      role: "assistant",
      callId: "call-1",
      toolName: "inventory_list",
      payload: { kind: "tool_call", arguments: {} },
    }),
    item({
      sequence: 2,
      type: "tool_result",
      role: "tool",
      callId: "call-1",
      toolName: "inventory_list",
      payload: { kind: "tool_result", result: { summary: "Found tomatoes" } },
    }),
    item({ sequence: 3, type: "message", role: "assistant", payload: { kind: "message", text: "Tomato soup." } }),
  ]);

  assert.equal(turns.length, 1);
  assert.equal(turns[0]?.userMessage?.text, "Make soup");
  assert.equal(turns[0]?.assistantMessage.text, "Tomato soup.");
  assert.deepEqual(turns[0]?.toolSteps.map(({ status, summary }) => ({ status, summary })), [
    { status: "completed", summary: "Found tomatoes" },
  ]);
});

test("validates persisted UI directives while mapping assistant messages", () => {
  const turns = mapConversationHistory([
    item({
      sequence: 0,
      type: "message",
      role: "assistant",
      payload: {
        kind: "message",
        text: "Updated inventory.",
        uiDirectives: [{
          component: "inventory_action_card",
          action: "updated",
          items: [{ id: "item-1", name: "Tomatoes", quantity: 2, unit: "pieces", location: "fridge" }],
        }],
      },
    }),
  ]);

  assert.equal(turns[0]?.uiDirectives[0]?.component, "inventory_action_card");
});
