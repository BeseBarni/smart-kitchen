import { tool, type ToolSet } from "ai";
import { chatJsonObjectSchema, chatJsonValueSchema } from "@app/modules";
import type { AgentStreamEvent } from "../../core/stream.types";
import type { UiDirective } from "../../core/ui.types";
import type { LedgerItem, ToolContext, ToolDefinition, ToolOutcome } from "../definitions/tool.types";

function summary(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 160);
  if (value !== null && typeof value === "object" && "name" in value && typeof value.name === "string") {
    return value.name.slice(0, 160);
  }
  return "Tool completed.";
}

function emit(events: ToolContext["emit"], event: AgentStreamEvent): void {
  events(event);
}

function jsonObject(value: unknown) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Tool arguments are not JSON serializable.");
  return chatJsonObjectSchema.parse(JSON.parse(encoded));
}

function jsonValue(value: unknown) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Tool result is not JSON serializable.");
  return chatJsonValueSchema.parse(JSON.parse(encoded));
}

async function saveToolResult(
  definition: ToolDefinition,
  context: ToolContext,
  callId: string,
  outcome: ToolOutcome,
): Promise<void> {
  const payload = outcome.success
    ? { kind: "tool_result" as const, result: jsonValue(outcome.data) }
    : { kind: "tool_result" as const, error: outcome.error };
  const item: LedgerItem = {
    type: "tool_result",
    role: "tool",
    callId,
    toolName: definition.name,
    payload,
  };
  await context.recordLedger([item]);
}

export async function executeToolCall(
  definition: ToolDefinition,
  input: unknown,
  context: ToolContext,
  callId: string,
): Promise<ToolOutcome> {
  emit(context.emit, {
    type: "agent_status",
    agent: context.agent,
    status: "running_tool",
    label: `Running ${definition.name}`,
  });
  emit(context.emit, {
    type: "tool_call_started",
    callId,
    agent: context.agent,
    toolName: definition.name,
    argsSummary: JSON.stringify(input).slice(0, 160),
  });
  await context.recordLedger([{
    type: "tool_call",
    role: "assistant",
    callId,
    toolName: definition.name,
    payload: { kind: "tool_call", arguments: jsonObject(input) },
  }]);
  let outcome: ToolOutcome;
  try {
    outcome = await definition.execute(input, context);
  } catch (error) {
    const failure: ToolOutcome = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Tool execution failed.",
      },
    };
    await saveToolResult(definition, context, callId, failure);
    emit(context.emit, {
      type: "tool_call_completed",
      callId,
      agent: context.agent,
      toolName: definition.name,
      success: false,
      summary: failure.error.message,
    });
    throw error;
  }
  await saveToolResult(definition, context, callId, outcome);
  let directive: UiDirective | undefined;
  try {
    directive = outcome.success
      ? outcome.uiDirective ?? definition.toUiDirective?.(outcome.data)
      : undefined;
  } catch (error) {
    emit(context.emit, {
      type: "tool_call_completed",
      callId,
      agent: context.agent,
      toolName: definition.name,
      success: outcome.success,
      summary: outcome.success ? summary(outcome.data) : outcome.error.message,
    });
    throw error;
  }
  if (directive) {
    emit(context.emit, {
      type: "ui_directive",
      callId,
      directive,
      invalidateDomains: definition.invalidateDomains ?? [],
    });
  }
  emit(context.emit, {
    type: "tool_call_completed",
    callId,
    agent: context.agent,
    toolName: definition.name,
    success: outcome.success,
    summary: outcome.success ? summary(outcome.data) : outcome.error.message,
  });
  const serialized = JSON.stringify(outcome);
  if (serialized === undefined) throw new Error(`Tool ${definition.name} returned a non-serializable result.`);
  return JSON.parse(serialized) as ToolOutcome;
}

export function toVercelTools(
  definitions: readonly ToolDefinition[],
  context: ToolContext,
): ToolSet {
  const tools: ToolSet = {};
  for (const definition of definitions) {
    tools[definition.name] = tool({
      description: definition.description,
      inputSchema: definition.modelInputSchema ?? definition.inputSchema,
      execute: (input, options) =>
        executeToolCall(definition, input, context, options.toolCallId),
    });
  }
  return tools;
}
