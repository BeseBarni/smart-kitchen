import { agentStreamEventSchema } from "@app/ai/stream-schema";
import type { AgentStreamEvent } from "@app/ai/types";
import { throwApiResponseError } from "@/lib/api-client";

export interface StreamTurnOptions {
  conversationId: string | null;
  message: string;
  signal: AbortSignal;
  onConversationId: (id: string) => void;
  onEvent: (event: AgentStreamEvent) => void | Promise<void>;
}

function parseFrame(frame: string): AgentStreamEvent | undefined {
  const lines = frame.split("\n");
  const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart()).join("\n");
  if (!data) return undefined;
  const value: unknown = JSON.parse(data);
  const event = agentStreamEventSchema.parse(value);
  if (eventName && eventName !== event.type) throw new Error("SSE event name does not match its payload.");
  return event;
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const event = parseFrame(buffer.slice(0, boundary));
        if (event) yield event;
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = parseFrame(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamChatTurn(options: StreamTurnOptions): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const endpoint = options.conversationId
    ? `/api/conversations/${encodeURIComponent(options.conversationId)}/stream`
    : "/api/chat";
  const body = options.conversationId
    ? { message: options.message }
    : { message: options.message };
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  const conversationId = response.headers.get("X-Conversation-Id");
  if (!response.ok) {
    if (conversationId) options.onConversationId(conversationId);
    await throwApiResponseError(response);
  }
  let started = false;
  try {
    if (!response.body) throw new Error("The streaming response did not contain a body.");
    let terminal = false;
    for await (const event of parseSseStream(response.body)) {
      if (event.type === "turn_started") started = true;
      if (event.type === "turn_completed" || event.type === "error") terminal = true;
      await options.onEvent(event);
    }
    if (!terminal && !options.signal.aborted) {
      throw new Error("The response was interrupted. Please try again.");
    }
  } finally {
    if (!started && conversationId) options.onConversationId(conversationId);
  }
}
