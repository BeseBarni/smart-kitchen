import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { generateConversationTitle } from "./agents/conversation-title";
import { isKitchenMessage } from "./agents/chat-restriction";
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

  assert.equal(await generateConversationTitle("How do I make soup?", model, "es"), "Tomato Soup");
  assert.deepEqual(model.doGenerateCalls[0]?.providerOptions?.google, { thinkingConfig: { thinkingLevel: "low" } });
  assert.match(JSON.stringify(model.doGenerateCalls[0]?.prompt), /Respond in Spanish/);
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

test("classifies the current message with recent conversation context", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"allowed":true}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });
  const input = {
    message: "Yes, for four people.",
    recentMessages: [{ role: "assistant" as const, text: "How many servings of soup?" }],
    abortSignal: new AbortController().signal,
    model,
  };
  assert.equal(await isKitchenMessage(input), true);
  assert.match(JSON.stringify(model.doGenerateCalls[0]?.prompt), /How many servings of soup/);
  assert.match(JSON.stringify(model.doGenerateCalls[0]?.prompt), /Yes, for four people/);
});

test("rejects off-topic classifications and surfaces invalid model output", async () => {
  const result = (text: string) => ({
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: undefined },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    },
    warnings: [],
  });
  const input = {
    message: "Explain orbital mechanics.",
    recentMessages: [],
    abortSignal: new AbortController().signal,
  };
  assert.equal(await isKitchenMessage({
    ...input,
    model: new MockLanguageModelV4({ doGenerate: result('{"allowed":false}') }),
  }), false);
  await assert.rejects(isKitchenMessage({
    ...input,
    model: new MockLanguageModelV4({ doGenerate: result('{"allowed":"yes"}') }),
  }));
});
