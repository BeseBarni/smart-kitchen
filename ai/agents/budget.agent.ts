import { runAgentLoop } from "./agent-loop";
import type { SubAgent } from "./agent.types";
import { budgetTools } from "../tools/definitions/budget.tools";
import { presentBudgetSummaryTool } from "../tools/definitions/ui.tools";

export const budgetAgent: SubAgent = {
  name: "budget_agent",
  description: "Answers spending questions and performs explicit budget or manual-expense mutations.",
  execute: (request, context) =>
    runAgentLoop({
      agent: "budget_agent",
      request,
      context,
      tools: [...budgetTools, presentBudgetSummaryTool],
      system: [
        "You are a focused budget and spending agent.",
        "Use budget tools instead of estimating totals.",
        "Resolve category slugs and merchant names before mutations.",
        "Never commit a scanned receipt unless the user explicitly requested immediate saving.",
        "Present a budget_summary_card when summarizing monthly standing.",
        "Use only budget, receipt, merchant, and the non-mutating budget summary UI domain.",
      ].join("\n"),
    }),
};
