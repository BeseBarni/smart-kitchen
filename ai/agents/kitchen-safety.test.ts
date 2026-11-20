import assert from "node:assert/strict";
import test from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { isSafeKitchenMessage } from "./kitchen-safety";

function model(text: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });
}

test("uses a typed safety classification and includes conversation context", async () => {
  const classifier = model('{"safe":false}');
  const safe = await isSafeKitchenMessage({
    message: "Can I do that?",
    recentMessages: [{ role: "assistant", text: "Let's discuss food safety." }],
    abortSignal: new AbortController().signal,
    model: classifier,
  });
  assert.equal(safe, false);
  assert.match(JSON.stringify(classifier.doGenerateCalls[0]?.prompt), /food safety/);
});

test("reports invalid safety classifier output", async () => {
  await assert.rejects(isSafeKitchenMessage({
    message: "Hello",
    recentMessages: [],
    abortSignal: new AbortController().signal,
    model: model('{"safe":"yes"}'),
  }));
});
