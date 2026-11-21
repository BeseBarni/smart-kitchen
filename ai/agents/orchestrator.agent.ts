import { chatService, inventoryService, profileService } from "@app/modules";
import type { ModelMessage } from "ai";
import { getChatModel } from "../core/llm.client";
import { buildOrchestratorPrompt } from "./orchestrator.prompt";
import { orchestratorTools } from "./orchestrator.tools";
import { runAgentLoop } from "./agent-loop";
import type { AgentContext, SubAgent, SubAgentRequest, SubAgentResult } from "./agent.types";
import type { ConversationItemDto } from "@app/modules";

export function toModelMessages(items: ConversationItemDto[]): ModelMessage[] {
  const messages: ModelMessage[] = [];
  for (const item of items) {
    if (item.type === "message" && item.payload.kind === "message" && item.payload.text.trim() &&
        (item.role === "user" || item.role === "system" || item.role === "assistant")) {
      messages.push({ role: item.role, content: item.payload.text });
    } else if (item.type === "skill_execution" && item.toolName === "vision_extractor" &&
               item.payload.kind === "skill_execution") {
      messages.push({
        role: "user",
        content: `<attached_image_analysis>\n${JSON.stringify(item.payload.output)}\n</attached_image_analysis>`,
      });
    }
  }
  return messages;
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
