import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { generateConversationTitle } from "./agents/conversation-title";
import { assistantMessagePayload } from "./runner";

test("assistant ledger payload preserves UI directives for history rendering", () => {
  const directive = {
    component: "inventory_action_card" as const,
    action: "added" as const,
    items: [{ id: "item-1", name: "Soup", quantity: 2, unit: "portion", location: "freezer" as const }],
  };
  assert.deepEqual(assistantMessagePayload("Added soup.", [directive]), {
    kind: "message",
    text: "Added soup.",
    uiDirectives: [directive],
  });
});

test("assistant ledger payload omits the optional directives field when empty", () => {
  assert.deepEqual(assistantMessagePayload("Hello.", []), {
    kind: "message",
    text: "Hello.",
  });
});

test("generates a short title using low-effort model settings", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"title":"Tomato Soup"}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });

  assert.equal(await generateConversationTitle("How do I make soup?", model), "Tomato Soup");
  assert.deepEqual(model.doGenerateCalls[0]?.providerOptions?.google, { thinkingConfig: { thinkingLevel: "low" } });
});

test("rejects a title that does not meet the output schema", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"title":"  "}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });
  await assert.rejects(generateConversationTitle("Hello", model));
});
