import type { AgentName, AgentStreamEvent } from "../core/stream.types";
import type { UiDirective } from "../core/ui.types";
import type { LedgerItem } from "../tools/definitions/tool.types";

export type { LedgerItem } from "../tools/definitions/tool.types";

export type AgentContext = {
  userId: string;
  conversationId: string;
  abortSignal: AbortSignal;
  emit: (event: AgentStreamEvent) => void;
  recordLedger: (items: LedgerItem[]) => Promise<void>;
  ledgerItems: LedgerItem[];
  usage: { inputTokens: number; outputTokens: number };
};

export type SubAgentRequest = {
  task: string;
  contextHint?: string;
};

export type SubAgentResult = {
  summary: string;
  structuredData?: unknown;
  uiDirectives: UiDirective[];
  ledgerItems: LedgerItem[];
  usage: { inputTokens: number; outputTokens: number };
};

export type SubAgent = {
  name: AgentName;
  description: string;
  execute(request: SubAgentRequest, context: AgentContext): Promise<SubAgentResult>;
};
