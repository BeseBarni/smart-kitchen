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

test("replays assistant recommendation chips with their message", () => {
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Make soup" } }),
    item({ sequence: 1, type: "message", role: "assistant", payload: {
      kind: "message",
      text: "Try tomato soup.",
      uiDirectives: [{ component: "recommendation_chips", recommendations: ["Add a side dish"] }],
    } }),
  ]);
  assert.deepEqual(turns[0]?.uiDirectives, [{ component: "recommendation_chips", recommendations: ["Add a side dish"] }]);
});

test("replays structured recipe cards without changing text-only history", () => {
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Make soup" } }),
    item({ sequence: 1, type: "message", role: "assistant", payload: {
      kind: "message",
      text: "Open the recipe.",
      uiDirectives: [{
        component: "recipe_preview_card",
        status: "draft",
        recipe: { title: "Soup", description: "", servings: 2, ingredients: [{ name: "Tomatoes", quantity: 2, unit: "pieces" }], instructions: ["Cook."] },
        canSave: true,
        canCookAndStock: false,
      }],
    } }),
    item({ sequence: 2, type: "message", role: "user", payload: { kind: "message", text: "Old recipe" } }),
    item({ sequence: 3, type: "message", role: "assistant", payload: { kind: "message", text: "Ingredients: tomatoes. Cook them." } }),
  ]);
  assert.equal(turns[0]?.uiDirectives[0]?.component, "recipe_preview_card");
  assert.equal(turns[1]?.assistantMessage.text, "Ingredients: tomatoes. Cook them.");
});

test("restores successful legacy recipe tool results without duplicating saved directives", () => {
  const recipe = { title: "Soup", description: "Warm", servings: 2, ingredients: [{ name: "Lentils", quantity: 1, unit: "cup" }], instructions: ["Simmer."] };
  const items = [
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Make soup" } }),
    item({ sequence: 1, type: "tool_result", role: "tool", callId: "call-1", toolName: "ui_present_recipe_draft", payload: { kind: "tool_result", result: recipe } }),
    item({ sequence: 2, type: "message", role: "assistant", payload: { kind: "message", text: "Lentils and instructions." } }),
  ];
  const legacy = mapConversationHistory(items)[0];
  assert.equal(legacy?.uiDirectives[0]?.component, "recipe_preview_card");
  assert.equal(legacy?.assistantMessage.text, "Lentils and instructions.");

  const saved = mapConversationHistory([...items.slice(0, 2), item({
    sequence: 2, type: "message", role: "assistant",
    payload: { kind: "message", text: "See recipe", uiDirectives: [{ component: "recipe_preview_card", status: "draft", recipe, canSave: true, canCookAndStock: false }] },
  })])[0];
  assert.equal(saved?.uiDirectives.length, 1);
});

test("does not turn invalid, failed, or unfinished legacy tool results into cards", () => {
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Try a recipe" } }),
    item({ sequence: 1, type: "tool_result", role: "tool", callId: "bad", toolName: "ui_present_recipe_draft", payload: { kind: "tool_result", result: { title: "Incomplete" } } }),
    item({ sequence: 2, type: "message", role: "assistant", payload: { kind: "message", text: "Could not make a recipe." } }),
    item({ sequence: 3, type: "message", role: "user", payload: { kind: "message", text: "Try again" } }),
    item({ sequence: 4, type: "tool_result", role: "tool", callId: "pending", toolName: "ui_present_recipe_draft", payload: { kind: "tool_result", result: { title: "Soup", description: "", servings: 2, ingredients: [], instructions: [] } } }),
  ]);
  assert.deepEqual(turns.map((turn) => turn.uiDirectives.length), [0, 0]);
});
