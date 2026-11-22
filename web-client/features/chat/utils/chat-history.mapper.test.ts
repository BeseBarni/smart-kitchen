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

test("replays one receipt card for an uploaded receipt without hiding later reviews", () => {
  const receipt = {
    component: "receipt_import_card", merchant: "Shop", purchasedAt: null, currency: "USD",
    totalAmount: 2, items: [],
  };
  const other = { component: "recommendation_chips", recommendations: ["Plan a meal"] };
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Scan receipt" } }),
    item({ sequence: 1, type: "skill_execution", role: "assistant", toolName: "vision_extractor",
      payload: { kind: "skill_execution", input: {}, output: { kind: "receipt" } } }),
    item({ sequence: 2, type: "message", role: "assistant", payload: {
      kind: "message", text: "Review it.", uiDirectives: [receipt, { ...receipt, merchant: "Shop Inc." }, other],
    } }),
    item({ sequence: 3, type: "message", role: "user", payload: { kind: "message", text: "Show my receipts" } }),
    item({ sequence: 4, type: "message", role: "assistant", payload: {
      kind: "message", text: "Here they are.", uiDirectives: [receipt, { ...receipt, merchant: "Another shop" }],
    } }),
  ]);
  assert.deepEqual(turns[0]?.uiDirectives, [receipt, other]);
  assert.deepEqual(turns[1]?.uiDirectives, [receipt, { ...receipt, merchant: "Another shop" }]);
});

test("retains receipt nutrition when restoring chat history", () => {
  const macros = { calories: 0.52, proteinG: 0.003, carbsG: 0.14, fatG: 0, fiberG: null };
  const receipt = {
    component: "receipt_import_card", merchant: null, purchasedAt: null, currency: "USD",
    totalAmount: 2, items: [{
      tempId: "1", name: "Apple", quantity: 500, unit: "g", priceAmount: 2,
      storageLocation: "fridge", estimatedShelfLifeDays: 7, isFoodItem: true,
      confidence: "high", estimatedMacrosPerUnit: macros,
    }],
  };
  const turns = mapConversationHistory([item({
    sequence: 0, type: "message", role: "assistant",
    payload: { kind: "message", text: "Review", uiDirectives: [receipt] },
  })]);
  const directive = turns[0]?.uiDirectives[0];
  assert.equal(directive?.component, "receipt_import_card");
  if (directive?.component === "receipt_import_card") {
    assert.deepEqual(directive.items[0]?.estimatedMacrosPerUnit, macros);
  }
});

test("restores receipt import status and the original directive index independently for each message", () => {
  const receipt = {
    component: "receipt_import_card", merchant: "Shop", purchasedAt: null, currency: "USD",
    totalAmount: 2, items: [],
  };
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "user", payload: { kind: "message", text: "Scan" } }),
    item({ sequence: 1, type: "skill_execution", role: "assistant", toolName: "vision_extractor",
      payload: { kind: "skill_execution", input: {}, output: { kind: "receipt" } } }),
    item({ sequence: 2, type: "message", role: "assistant", payload: {
      kind: "message", text: "Review", uiDirectives: [
        { component: "recommendation_chips", recommendations: ["Next"] }, receipt, receipt,
      ], importedReceiptIndexes: [1],
    } }),
    item({ sequence: 3, type: "message", role: "user", payload: { kind: "message", text: "Again" } }),
    item({ sequence: 4, type: "message", role: "assistant", payload: {
      kind: "message", text: "Review", uiDirectives: [receipt],
    } }),
  ]);
  assert.deepEqual(turns[0]?.receiptSources?.[1], {
    conversationId, itemId: "00000000-0000-4000-8000-000000000003", directiveIndex: 1, imported: true,
  });
  assert.equal(turns[0]?.uiDirectives.length, 2);
  assert.equal(turns[1]?.receiptSources?.[0]?.imported, false);
  assert.notEqual(turns[0]?.receiptSources?.[1]?.itemId, turns[1]?.receiptSources?.[0]?.itemId);
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

test("retains a persisted recipe image reference when restoring chat history", () => {
  const turns = mapConversationHistory([
    item({ sequence: 0, type: "message", role: "assistant", payload: {
      kind: "message", text: "Open the recipe.", uiDirectives: [{
        component: "recipe_preview_card", status: "draft", canSave: true, canCookAndStock: false,
        recipe: {
          title: "Chicken gyros", description: "", servings: 2, ingredients: [], instructions: ["Cook."],
          stockImageKind: "themealdb_meal", stockImageName: "hcg6l91763596970.jpg",
        },
      }],
    } }),
  ]);
  const directive = turns[0]?.uiDirectives[0];
  assert.equal(directive?.component, "recipe_preview_card");
  if (directive?.component !== "recipe_preview_card") return;
  assert.equal(directive.recipe.stockImageKind, "themealdb_meal");
  assert.equal(directive.recipe.stockImageName, "hcg6l91763596970.jpg");
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
