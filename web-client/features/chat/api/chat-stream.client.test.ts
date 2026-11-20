import assert from "node:assert/strict";
import test from "node:test";
import { parseSseStream, streamChatTurn } from "./chat-stream.client";
import { ApiClientError } from "@/lib/api-client";

function readableChunks(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test("parses chunked SSE frames and normalizes CRLF boundaries", async () => {
  const stream = readableChunks([
    'event: text_delta\r',
    '\ndata: {"type":"text_delta","delta":"hello"}\r\n\r\n',
    'event: turn_completed\ndata: {"type":"turn_completed","conversationId":"conversation-1","usage":{"inputTokens":2,"outputTokens":1},"latencyMs":25}',
  ]);
  const events = [];
  for await (const event of parseSseStream(stream)) events.push(event);

  assert.deepEqual(events, [
    { type: "text_delta", delta: "hello" },
    {
      type: "turn_completed",
      conversationId: "conversation-1",
      usage: { inputTokens: 2, outputTokens: 1 },
      latencyMs: 25,
    },
  ]);
});

test("rejects SSE frames whose event name differs from the payload", async () => {
  const stream = readableChunks([
    'event: agent_status\ndata: {"type":"text_delta","delta":"hello"}\n\n',
  ]);

  await assert.rejects(parseSseStream(stream).next(), /SSE event name does not match its payload/);
});

test("reports a stream that ends without a terminal event", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(readableChunks([
    'event: text_delta\ndata: {"type":"text_delta","delta":"partial"}\n\n',
  ]));
  try {
    await assert.rejects(streamChatTurn({
      conversationId: "conversation-1",
      message: "Hello",
      signal: new AbortController().signal,
      onConversationId: () => {},
      onEvent: () => {},
    }), /response was interrupted/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts a terminal error event without reporting a second interruption", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(readableChunks([
    'event: error\ndata: {"type":"error","code":"INTERNAL_ERROR","message":"Please try again.","recoverable":true}\n\n',
  ]));
  const events: string[] = [];
  try {
    await streamChatTurn({
      conversationId: "conversation-1",
      message: "Hello",
      signal: new AbortController().signal,
      onConversationId: () => {},
      onEvent: (event) => { events.push(event.type); },
    });

    assert.deepEqual(events, ["error"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports a rejected message with its reason and conversation id", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: "VALIDATION_ERROR", message: "Not allowed.", details: { reason: "off_topic" } },
  }), { status: 422, headers: { "X-Conversation-Id": "conversation-1" } });
  let id = "";
  try {
    await assert.rejects(streamChatTurn({
      conversationId: null,
      message: "Test",
      signal: new AbortController().signal,
      onConversationId: (value) => { id = value; },
      onEvent: () => {},
    }), (error: unknown) => error instanceof ApiClientError && error.details?.reason === "off_topic");
    assert.equal(id, "conversation-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
