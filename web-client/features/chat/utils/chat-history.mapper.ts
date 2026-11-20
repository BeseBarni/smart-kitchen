import { uiDirectiveSchema } from "@app/ai/stream-schema";
import type { ChatJsonValue, ConversationItemDto } from "@app/modules/schemas";
import type { ChatTurn, ChatToolStep } from "../types";

function jsonSummary(value: ChatJsonValue | undefined): string {
  if (value === undefined) return "Completed";
  if (typeof value === "object" && value !== null && !Array.isArray(value) &&
      "summary" in value && typeof value.summary === "string") {
    return value.summary;
  }
  return JSON.stringify(value);
}

function createTurn(id: string, createdAt: string, text = ""): ChatTurn {
  return {
    id,
    ...(text ? { userMessage: { id: `${id}-user`, role: "user", text, createdAt } } : {}),
    assistantMessage: { id: `${id}-assistant`, role: "assistant", text: "", createdAt },
    toolSteps: [],
    uiDirectives: [],
    activeStatus: null,
  };
}

export function mapConversationHistory(items: readonly ConversationItemDto[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  let current: ChatTurn | undefined;
  const ensureTurn = (id: string, createdAt: string): ChatTurn => {
    if (!current) {
      current = createTurn(id, createdAt);
      turns.push(current);
    }
    return current;
  };

  for (const item of items) {
    if (item.type === "message" && item.payload.kind === "message") {
      if (item.role === "user") {
        current = createTurn(item.id, item.createdAt, item.payload.text);
        turns.push(current);
      } else if (item.role === "assistant") {
        const turn = ensureTurn(item.id, item.createdAt);
        turn.assistantMessage = {
          ...turn.assistantMessage,
          text: turn.assistantMessage.text + item.payload.text,
          createdAt: item.createdAt,
        };
        for (const directive of item.payload.uiDirectives ?? []) {
          turn.uiDirectives.push(uiDirectiveSchema.parse(directive));
        }
      }
      continue;
    }

    const turn = ensureTurn(item.id, item.createdAt);
    if (item.type === "tool_call" && item.payload.kind === "tool_call") {
      if (!item.callId || !item.toolName) throw new Error("Persisted tool call is missing its correlation data.");
      const step: ChatToolStep = {
        id: item.callId,
        agent: null,
        toolName: item.toolName,
        argsSummary: JSON.stringify(item.payload.arguments).slice(0, 120),
        status: "running",
        summary: "Running",
      };
      turn.toolSteps.push(step);
    } else if (item.type === "tool_result" && item.payload.kind === "tool_result") {
      if (!item.callId || !item.toolName) throw new Error("Persisted tool result is missing its correlation data.");
      const stepIndex = turn.toolSteps.findIndex((entry) => entry.id === item.callId);
      const resultSummary = item.payload.error
        ? item.payload.error.message
        : jsonSummary(item.payload.result);
      if (stepIndex < 0) {
        turn.toolSteps.push({
          id: item.callId,
          agent: null,
          toolName: item.toolName,
          argsSummary: "",
          status: item.payload.error ? "failed" : "completed",
          summary: resultSummary,
        });
      } else {
        const existing = turn.toolSteps[stepIndex];
        if (existing) turn.toolSteps[stepIndex] = {
          ...existing,
          status: item.payload.error ? "failed" : "completed",
          summary: resultSummary,
        };
      }
    } else if (item.type === "skill_execution" && item.payload.kind === "skill_execution") {
      turn.toolSteps.push({
        id: item.id,
        agent: null,
        toolName: item.toolName ?? "Skill",
        argsSummary: JSON.stringify(item.payload.input).slice(0, 120),
        status: "completed",
        summary: JSON.stringify(item.payload.output),
      });
    }
  }
  return turns;
}
