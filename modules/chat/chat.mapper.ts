import type {
  ChatJsonValue,
  ConversationItemDto,
  ConversationItemPayloadDto,
} from "./chat.schema";

export type ChatModelMessage =
  | { role: "user" | "assistant" | "system"; content: string }
  | {
      role: "assistant";
      content: Array<
        | { type: "text"; text: string }
        | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            input: Readonly<Record<string, ChatJsonValue>>;
          }
      >;
    }
  | {
      role: "tool";
      content: Array<{
        type: "tool-result";
        toolCallId: string;
        toolName: string;
        output: { type: "json"; value: ChatJsonValue } | { type: "error-text"; value: string };
      }>;
    };

export type ClientHistoryEntry = {
  id: string;
  sequence: number;
  type: ConversationItemDto["type"];
  role: ConversationItemDto["role"];
  callId: string | null;
  toolName: string | null;
  payload: ConversationItemPayloadDto;
  metadata: ConversationItemDto["metadata"];
  createdAt: string;
};

function isMessage(
  payload: ConversationItemPayloadDto,
): payload is Extract<ConversationItemPayloadDto, { kind: "message" }> {
  return payload.kind === "message";
}

export function toModelMessages(items: ConversationItemDto[]): ChatModelMessage[] {
  const messages: ChatModelMessage[] = [];
  for (const item of items) {
    if (item.type === "message" && isMessage(item.payload)) {
      if (item.role === "user" || item.role === "assistant" || item.role === "system") {
        messages.push({ role: item.role, content: item.payload.text });
      }
    } else if (item.type === "tool_call" && item.payload.kind === "tool_call") {
      if (item.callId === null || item.toolName === null) {
        throw new Error("Tool call ledger item is missing its call identifier or tool name.");
      }
      messages.push({
        role: "assistant",
        content: [{
          type: "tool-call",
          toolCallId: item.callId,
          toolName: item.toolName,
          input: item.payload.arguments,
        }],
      });
    } else if (item.type === "tool_result" && item.payload.kind === "tool_result") {
      if (item.callId === null || item.toolName === null) {
        throw new Error("Tool result ledger item is missing its call identifier or tool name.");
      }
      const output = item.payload.error
        ? { type: "error-text" as const, value: item.payload.error.message }
        : { type: "json" as const, value: item.payload.result ?? null };
      messages.push({
        role: "tool",
        content: [{
          type: "tool-result",
          toolCallId: item.callId,
          toolName: item.toolName,
          output,
        }],
      });
    } else if (item.type === "skill_execution" && item.payload.kind === "skill_execution") {
      messages.push({
        role: "assistant",
        content: `Completed skill execution.\nInput: ${JSON.stringify(item.payload.input)}\nOutput: ${JSON.stringify(item.payload.output)}`,
      });
    }
  }
  return messages;
}

export function toClientHistory(items: ConversationItemDto[]): ClientHistoryEntry[] {
  return items.map(({ id, sequence, type, role, callId, toolName, payload, metadata, createdAt }) => ({
    id,
    sequence,
    type,
    role,
    callId,
    toolName,
    payload,
    metadata,
    createdAt,
  }));
}
