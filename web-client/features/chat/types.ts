import type { AgentName, AgentStreamEvent, UiDirective } from "@app/ai/types";
import type { ConversationDto, ConversationItemDto } from "@app/modules/schemas";

export type { UiDirective };
export type { ConversationDto, ConversationItemDto };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  rejected?: boolean;
}

export interface ChatToolStep {
  id: string;
  agent: AgentName | null;
  toolName: string;
  argsSummary: string;
  status: "running" | "completed" | "failed";
  summary: string;
}

export type AgentStatus = Extract<AgentStreamEvent, { type: "agent_status" }>;

export interface ChatTurn {
  id: string;
  userMessage?: ChatMessage;
  assistantMessage: ChatMessage;
  toolSteps: ChatToolStep[];
  uiDirectives: UiDirective[];
  activeStatus: AgentStatus | null;
}

export interface ConversationHistory {
  conversation: ConversationDto;
  items: ConversationItemDto[];
}

export interface MappedConversationHistory extends ConversationHistory {
  turns: ChatTurn[];
}

export interface QuickPrompt {
  id: "plan" | "rescue" | "meal" | "quick";
  label: string;
}

export const quickPrompts: readonly QuickPrompt[] = [
  { id: "plan", label: "Plan Meal Prep" },
  { id: "rescue", label: "Fridge Rescue" },
  { id: "meal", label: "Log Eaten Meal" },
  { id: "quick", label: "Quick Log" },
];
