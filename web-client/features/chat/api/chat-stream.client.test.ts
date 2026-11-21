import assert from "node:assert/strict";
import test from "node:test";
import { parseSseStream, streamChatTurn } from "./chat-stream.client";
import { ApiClientError } from "@/lib/api-client";
import { languageStore } from "@/lib/i18n/language.store";
import { conversationStreamInputSchema } from "@app/modules/schemas";

function readableChunks(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test("sends the selected language to both chat endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const previous = languageStore.getState().locale;
  const requests: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response(readableChunks([
      'event: turn_completed\ndata: {"type":"turn_completed","conversationId":"c","usage":{"inputTokens":0,"outputTokens":0},"latencyMs":1}\n\n',
    ]));
  };
  try {
    languageStore.getState().setLocale("hu");
    for (const conversationId of [null, "conversation-1"]) {
      await streamChatTurn({ conversationId, message: "Soup", signal: new AbortController().signal, onConversationId: () => {}, onEvent: () => {} });
    }
    assert.deepEqual(requests.map((request) => request.body), [
      { message: "Soup", locale: "hu" }, { message: "Soup", locale: "hu" },
    ]);
    assert.match(requests[0]?.url ?? "", /\/api\/chat$/);
    assert.match(requests[1]?.url ?? "", /\/api\/conversations\/conversation-1\/stream$/);
  } finally {
    languageStore.getState().setLocale(previous);
    globalThis.fetch = originalFetch;
  }
});

test("sends nonempty uploaded and legacy attachment fields accepted by the server schema", async () => {
  const originalFetch = globalThis.fetch;
  const requests: unknown[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(readableChunks([
      'event: turn_completed\ndata: {"type":"turn_completed","conversationId":"c","usage":{"inputTokens":0,"outputTokens":0},"latencyMs":1}\n\n',
    ]));
  };
  const assetId = "d2166458-1dcf-4eac-9014-d388b5f4a492";
  const uploaded = { id: "1", assetId, name: "photo.webp", mimeType: "image/webp" as const };
  const legacy = { id: "2", name: "photo.jpg", mimeType: "image/jpeg" as const, base64Data: "YWJj" };
  try {
    for (const [conversationId, attachments] of [
      [null, [uploaded]],
      ["conversation-1", [legacy]],
      [null, [uploaded, legacy]],
    ] as const) {
      await streamChatTurn({
        conversationId,
        message: "",
        attachments,
        signal: new AbortController().signal,
        onConversationId: () => {},
        onEvent: () => {},
      });
    }
    for (const request of requests) assert.equal(conversationStreamInputSchema.safeParse(request).success, true);
    assert.deepEqual((requests[0] as { attachmentAssetIds: string[] }).attachmentAssetIds, [assetId]);
    assert.equal(Object.hasOwn(requests[0] as object, "attachments"), false);
    assert.equal(Object.hasOwn(requests[1] as object, "attachmentAssetIds"), false);
    assert.equal((requests[1] as { attachments: unknown[] }).attachments.length, 1);
    assert.equal((requests[2] as { attachments: unknown[] }).attachments.length, 1);
    assert.deepEqual((requests[2] as { attachmentAssetIds: string[] }).attachmentAssetIds, [assetId]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not silently drop an attachment that is not ready to send", async () => {
  await assert.rejects(streamChatTurn({
    conversationId: null,
    message: "",
    attachments: [{ id: "1", name: "photo.jpg", mimeType: "image/jpeg" }],
    signal: new AbortController().signal,
    onConversationId: () => {},
    onEvent: () => {},
  }), /attachment is not ready/i);
});

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

test("delivers the persisted turn identity before activating a successful new conversation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(readableChunks([
    'event: turn_started\ndata: {"type":"turn_started","conversationId":"conversation-1","turnId":"user-item-1"}\n\n',
    'event: turn_completed\ndata: {"type":"turn_completed","conversationId":"conversation-1","usage":{"inputTokens":0,"outputTokens":0},"latencyMs":1}\n\n',
  ]), { headers: { "X-Conversation-Id": "conversation-1" } });
  const calls: string[] = [];
  try {
    await streamChatTurn({
      conversationId: null,
      message: "Soup",
      signal: new AbortController().signal,
      onConversationId: () => { calls.push("header"); },
      onEvent: (event) => {
        if (event.type === "turn_started") calls.push(event.turnId);
      },
    });
    assert.deepEqual(calls, ["user-item-1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retains the conversation id if the stream fails before the turn starts", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(readableChunks([]), {
    headers: { "X-Conversation-Id": "conversation-1" },
  });
  let id = "";
  try {
    await assert.rejects(streamChatTurn({
      conversationId: null,
      message: "Soup",
      signal: new AbortController().signal,
      onConversationId: (value) => { id = value; },
      onEvent: () => {},
    }), /response was interrupted/i);
    assert.equal(id, "conversation-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
