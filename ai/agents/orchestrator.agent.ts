import { chatService, inventoryService, profileService } from "@app/modules";
import type { ModelMessage } from "ai";
import { getChatModel } from "../core/llm.client";
import { buildOrchestratorPrompt } from "./orchestrator.prompt";
import { orchestratorTools } from "./orchestrator.tools";
import { runAgentLoop } from "./agent-loop";
import type { AgentContext, SubAgent, SubAgentRequest, SubAgentResult } from "./agent.types";
import type { ConversationItemDto } from "@app/modules";

function toModelMessages(items: ConversationItemDto[]): ModelMessage[] {
  return items.flatMap((item) =>
    item.type === "message" &&
    item.payload.kind === "message" &&
    (item.role === "user" || item.role === "system" || item.role === "assistant")
      ? [{ role: item.role, content: item.payload.text }]
      : [],
  );
}

async function loadPromptContext(context: AgentContext, conversationId: string) {
  const [profile, inventory, recent] = await Promise.all([
    profileService.getOrCreateProfile(context.userId),
    inventoryService.getSummary(context.userId),
    chatService.getRecentContextItems(context.userId, conversationId, { maxItems: 30 }),
  ]);
  if (!profile.success) throw new Error(profile.error.message);
  if (!inventory.success) throw new Error(inventory.error.message);
  if (!recent.success) throw new Error(recent.error.message);
  return {
    profile: profile.data,
    inventory: inventory.data,
    messages: toModelMessages(recent.data),
  };
}

async function executeTurn(
  request: SubAgentRequest & { conversationId: string },
  context: AgentContext,
): Promise<SubAgentResult> {
  const promptContext = await loadPromptContext(context, request.conversationId);
  return runAgentLoop({
    agent: "orchestrator",
    request,
    context,
    model: getChatModel(),
    messages: promptContext.messages,
    tools: orchestratorTools(context),
    forwardText: true,
    system: buildOrchestratorPrompt(promptContext.profile, promptContext.inventory),
  });
}

export const orchestratorAgent: SubAgent = {
  name: "orchestrator",
  description: "User-facing kitchen agent that streams replies and delegates bounded domain work.",
  execute: (request, context) =>
    executeTurn({ ...request, conversationId: context.conversationId }, context),
};
