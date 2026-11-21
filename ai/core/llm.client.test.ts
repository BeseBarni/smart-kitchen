import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { generateStructuredMultimodal, generateStructuredWithUsage } from "./llm.client";

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 2, text: 2, reasoning: undefined },
};

test("retries invalid structured output with a correction and retains usage", async () => {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: ++calls === 1 ? '{"name":42}' : '{"name":"Soup"}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
  const result = await generateStructuredWithUsage({ schema: z.object({ name: z.string() }), prompt: "Describe food.", model });
  assert.deepEqual(result, { success: true, data: { output: { name: "Soup" }, usage: { inputTokens: 3, outputTokens: 2 } } });
  assert.equal(calls, 2);
  assert.match(JSON.stringify(model.doGenerateCalls[1]?.prompt), /Correct the prior output/);
});

test("reports invalid structured output after the retry", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"name":42}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    },
  });
  const result = await generateStructuredWithUsage({ schema: z.object({ name: z.string() }), prompt: "Describe food.", model });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.equal(model.doGenerateCalls.length, 2);
});

test("sends images as file parts with their media type and data", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"name":"Soup"}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    },
  });
  const warnings: string[] = [];
  const previousLogger = globalThis.AI_SDK_LOG_WARNINGS;
  globalThis.AI_SDK_LOG_WARNINGS = ({ warnings: reported }) => {
    warnings.push(...reported.map((warning) => JSON.stringify(warning)));
  };
  try {
    const result = await generateStructuredMultimodal({
      schema: z.object({ name: z.string() }),
      prompt: "Identify the food.",
      images: [{ mimeType: "image/png", base64Data: "YWJj" }],
      model,
    });
    assert.equal(result.success, true);
  } finally {
    globalThis.AI_SDK_LOG_WARNINGS = previousLogger;
  }
  assert.deepEqual(warnings, []);
  const userMessage = model.doGenerateCalls[0]?.prompt.find((message) => message.role === "user");
  assert.ok(userMessage && userMessage.role === "user");
  const file = userMessage.content.find((part) => part.type === "file");
  assert.ok(file && file.type === "file");
  assert.equal(file.mediaType, "image/png");
  assert.deepEqual(file.data, { type: "data", data: "YWJj" });
});
