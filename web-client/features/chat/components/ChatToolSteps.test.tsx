import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChatToolStep } from "../types";
import { ChatToolSteps } from "./ChatToolSteps";

test("tool activity shows localized action and state labels, not internal identifiers", () => {
  const steps: ChatToolStep[] = [{
    id: "step-1",
    agent: null,
    toolName: "inventory_list",
    argsSummary: "{}",
    status: "completed",
    summary: "Tool completed.",
  }];
  const markup = renderToStaticMarkup(<ChatToolSteps steps={steps} />);

  assert.match(markup, /Checking your inventory/);
  assert.match(markup, /Completed/);
  assert.doesNotMatch(markup, /inventory_list|Tool completed/);
});
