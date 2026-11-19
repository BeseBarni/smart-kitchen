import { stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import type { AgentName } from "../core/stream.types";
import { getFastModel, getReasoningModel, streamWithTools } from "../core/llm.client";
import { toVercelTools } from "../tools/adapters/vercel.adapter";
import type { ToolDefinition } from "../tools/definitions/tool.types";
import type { AgentContext, SubAgentRequest, SubAgentResult } from "./agent.types";

export async function runAgentLoop(input: {
  agent: AgentName;
  system: string;
  request: SubAgentRequest;
  tools: readonly ToolDefinition[];
  context: AgentContext;
  forwardText?: boolean;
  messages?: ModelMessage[];
  modelTier?: "fast" | "reasoning";
  model?: LanguageModel;
}): Promise<SubAgentResult> {
  const ledgerStart = input.context.ledgerItems.length;
  const toolContext = { ...input.context, agent: input.agent };
  const tools: ToolSet = toVercelTools(input.tools, toolContext);
  input.context.emit({
    type: "agent_status",
    agent: input.agent,
    status: "thinking",
    label: `Working on: ${input.request.task.slice(0, 100)}`,
  });
  const stream = streamWithTools({
    model: input.model ?? (
      input.modelTier === "reasoning" ? getReasoningModel() : getFastModel()
    ),
    system: input.system,
    messages: input.messages ?? [{
      role: "user",
      content: [input.request.task, input.request.contextHint].filter(Boolean).join("\n\n"),
    }],
    tools,
    stopWhen: stepCountIs(5),
    abortSignal: input.context.abortSignal,
  });

  let summary = "";
  for await (const part of stream.fullStream) {
    if (part.type === "text-delta") {
      summary += part.text;
      if (input.forwardText) input.context.emit({ type: "text_delta", delta: part.text });
    } else if (part.type === "error") {
      throw part.error;
    }
  }
  const usage = await stream.totalUsage;
  const usageTotal = {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
  input.context.usage.inputTokens += usageTotal.inputTokens;
  input.context.usage.outputTokens += usageTotal.outputTokens;
  return {
    summary,
    uiDirectives: [],
    ledgerItems: input.context.ledgerItems.slice(ledgerStart),
    usage: usageTotal,
  };
}
