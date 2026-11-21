import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { generateConversationTitle } from "./agents/conversation-title";
import { isKitchenMessage } from "./agents/chat-restriction";
import { assistantMessagePayload, createTurnEmitter } from "./runner";
import { toModelMessages } from "./agents/orchestrator.agent";
import { visionExtractorInputSchema, visionSkillImages } from "./skills/vision-extractor.skill";
import type { ConversationItemDto } from "@app/modules";
import type { AgentStreamEvent } from "./core/stream.types";
import type { UiDirective } from "./core/ui.types";

test("streams and persists only the automatic receipt card for an uploaded receipt", () => {
  const events: AgentStreamEvent[] = [];
  const turn = createTurnEmitter((event) => events.push(event));
  const receipt: Extract<UiDirective, { component: "receipt_import_card" }> = {
    component: "receipt_import_card", merchant: "Shop", purchasedAt: null, currency: "USD",
    totalAmount: 2, items: [],
  };
  const recommendation: UiDirective = { component: "recommendation_chips", recommendations: ["Plan a meal"] };
  turn.emitReceipt(receipt);
  turn.emit({ type: "ui_directive", directive: { ...receipt, merchant: "Shop Inc." }, invalidateDomains: [] });
  turn.emit({ type: "ui_directive", directive: recommendation, invalidateDomains: [] });
  turn.emit({ type: "text_delta", delta: "Review your receipt." });
  assert.deepEqual(events.map((event) => event.type), ["ui_directive", "ui_directive", "text_delta"]);
  assert.deepEqual(assistantMessagePayload("Review your receipt.", turn.directives).uiDirectives, [receipt, recommendation]);
});

test("allows a receipt review tool on a turn without an automatic receipt", () => {
  const events: AgentStreamEvent[] = [];
  const turn = createTurnEmitter((event) => events.push(event));
  const directive: UiDirective = {
    component: "receipt_import_card", merchant: null, purchasedAt: null, currency: "USD",
    totalAmount: null, items: [],
  };
  turn.emit({ type: "ui_directive", directive, invalidateDomains: [] });
  assert.deepEqual(turn.directives, [directive]);
  assert.equal(events.length, 1);
});

test("projects uploaded attachment metadata into strict vision input", () => {
  const attachments = [{
    name: "photo.jpg", mimeType: "image/jpeg" as const, base64Data: "YWJj",
    width: 640, height: 480, sizeBytes: 3,
  }];
  const images = visionSkillImages(attachments);
  assert.deepEqual(images, [{ mimeType: "image/jpeg", base64Data: "YWJj" }]);
  assert.equal(visionExtractorInputSchema.safeParse({
    images, userLocale: "en", defaultCurrency: "HUF",
  }).success, true);
});

test("passes persisted image analysis to the orchestrator including on later turns", () => {
  const common = {
    conversationId: "00000000-0000-4000-8000-000000000001",
    callId: null, metadata: null, createdAt: "2026-01-01T10:00:00.000Z",
  };
  const items: ConversationItemDto[] = [
    { ...common, id: "00000000-0000-4000-8000-000000000002", sequence: 1,
      type: "message", role: "user", toolName: null, payload: { kind: "message", text: "" } },
    { ...common, id: "00000000-0000-4000-8000-000000000003", sequence: 2,
      type: "skill_execution", role: "assistant", toolName: "vision_extractor",
      payload: { kind: "skill_execution", input: { count: 1 }, output: { kind: "prepared_dish", dishName: "Soup" } } },
    { ...common, id: "00000000-0000-4000-8000-000000000004", sequence: 3,
      type: "message", role: "user", toolName: null, payload: { kind: "message", text: "What is in it?" } },
  ];
  assert.deepEqual(toModelMessages(items), [
    { role: "user", content: '<attached_image_analysis>\n{"kind":"prepared_dish","dishName":"Soup"}\n</attached_image_analysis>' },
    { role: "user", content: "What is in it?" },
  ]);
});

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
