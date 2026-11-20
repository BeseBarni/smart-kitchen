import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { z } from "zod";
import { defineTool } from "../tools/definitions/tool.types";
import { runAgentLoop } from "./agent-loop";

test("propagates unexpected tool failures instead of completing the turn", async () => {
  const model = new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "tool-call", toolCallId: "call-1", toolName: "fails", input: "{}" },
          {
            type: "finish",
            finishReason: { unified: "tool-calls", raw: undefined },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 1, text: 1, reasoning: undefined },
            },
          },
        ],
      }),
    },
  });
  const failingTool = defineTool({
    name: "fails",
    description: "A tool that fails unexpectedly.",
    inputSchema: z.object({}).strict(),
    annotations: {},
    execute: async () => { throw new Error("Provider quota exceeded"); },
  });
  await assert.rejects(runAgentLoop({
    agent: "orchestrator",
    system: "Test",
    request: { task: "Test" },
    tools: [failingTool],
    model,
    context: {
      userId: "user-1",
      conversationId: "conversation-1",
      abortSignal: new AbortController().signal,
      emit: () => {},
      recordLedger: async () => {},
      ledgerItems: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    },
  }), /Provider quota exceeded/);
});
