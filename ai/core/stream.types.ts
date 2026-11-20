import type { AppDomain } from "@app/shared";
import type { AppErrorCode } from "@app/shared";
import type { UiDirective } from "./ui.types";

export type AgentName =
  | "orchestrator"
  | "inventory_ops"
  | "recipe_architect"
  | "kitchen_advisor";

export type AgentStreamEvent =
  | { type: "turn_started"; conversationId: string; turnId: string }
  | {
      type: "agent_status";
      agent: AgentName;
      status: "thinking" | "delegating" | "running_tool" | "running_skill";
      label: string;
    }
  | { type: "text_delta"; delta: string }
  | {
      type: "tool_call_started";
      callId: string;
      agent: AgentName;
      toolName: string;
      argsSummary: string;
    }
  | {
      type: "tool_call_completed";
      callId: string;
      agent: AgentName;
      toolName: string;
      success: boolean;
      summary: string;
    }
  | { type: "skill_completed"; skillName: string; latencyMs: number }
  | {
      type: "ui_directive";
      callId?: string;
      directive: UiDirective;
      invalidateDomains: AppDomain[];
    }
  | {
      type: "turn_completed";
      conversationId: string;
      usage: { inputTokens: number; outputTokens: number };
      latencyMs: number;
    }
  | { type: "error"; code: AppErrorCode; message: string; recoverable: boolean };

export type UiDirectiveEvent = Extract<AgentStreamEvent, { type: "ui_directive" }>;
