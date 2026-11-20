import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { ok } from "@app/shared";
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

test("allows the model to correct invalid tool arguments and finish", async () => {
  let calls = 0;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  };
  const model = new MockLanguageModelV4({
    doStream: async () => {
      calls += 1;
      if (calls === 1) return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "tool-call", toolCallId: "invalid-1", toolName: "lookup", input: '{"name":42}' },
            { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
          ],
        }),
      };
      if (calls === 2) return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "tool-call", toolCallId: "valid-1", toolName: "lookup", input: '{"name":"Soup"}' },
            { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
          ],
        }),
      };
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Here's your recipe." },
            { type: "text-end", id: "text-1" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
          ],
        }),
      };
    },
  });
  const lookup = defineTool({
    name: "lookup",
    description: "Look up a name.",
    inputSchema: z.object({ name: z.string() }).strict(),
    annotations: {},
    execute: async ({ name }) => ok(name),
  });
  const result = await runAgentLoop({
    agent: "recipe_architect",
    system: "Test",
    request: { task: "Test" },
    tools: [lookup],
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
  });
  assert.equal(result.summary, "Here's your recipe.");
  assert.equal(calls, 3);
});

test("finishes a workflow requiring more than five model steps", async () => {
  let calls = 0;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  };
  const model = new MockLanguageModelV4({
    doStream: async () => {
      calls += 1;
      if (calls <= 6) return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "tool-call", toolCallId: `call-${calls}`, toolName: "lookup", input: "{}" },
            { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
          ],
        }),
      };
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Done." },
            { type: "text-end", id: "text-1" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
          ],
        }),
      };
    },
  });
  const lookup = defineTool({
    name: "lookup",
    description: "Look up information.",
    inputSchema: z.object({}).strict(),
    annotations: {},
    execute: async () => ok("Found."),
  });
  const result = await runAgentLoop({
    agent: "recipe_architect",
    system: "Test",
    request: { task: "Test" },
    tools: [lookup],
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
  });
  assert.equal(result.summary, "Done.");
  assert.equal(calls, 7);
});
