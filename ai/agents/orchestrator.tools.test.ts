import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { LedgerItem } from "./agent.types";
import { orchestratorTools } from "./orchestrator.tools";
import { recipeArchitectAgent } from "./recipe-architect.agent";

test("save delegation reports success only with an actual saved recipe", async () => {
  const ledgerItems: LedgerItem[] = [];
  const execute = mock.method(recipeArchitectAgent, "execute", async () => ({
    summary: "Recipe saved.",
    uiDirectives: [],
    ledgerItems,
    usage: { inputTokens: 0, outputTokens: 0 },
  }));
  try {
    const context = {
      userId: "user-1",
      conversationId: "conversation-1",
      abortSignal: new AbortController().signal,
      emit: () => {},
      recordLedger: async () => {},
      ledgerItems: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    const recipe = orchestratorTools(context).find((tool) => tool.name === "delegate_to_recipe_architect");
    assert.ok(recipe);
    const input = { task: "Save the approved recipe.", mode: "save" };
    const missing = await recipe.execute(input, { ...context, agent: "orchestrator" });
    assert.equal(missing.success, false);
    if (!missing.success) assert.equal(missing.error.code, "VALIDATION_ERROR");

    ledgerItems.push({
      type: "tool_result",
      role: "tool",
      callId: "call-1",
      toolName: "recipes_create",
      payload: {
        kind: "tool_result",
        result: { id: "00000000-0000-4000-8000-000000000001", title: "Lentil soup" },
      },
    });
    const saved = await recipe.execute(input, { ...context, agent: "orchestrator" });
    assert.equal(saved.success, true);
    if (saved.success) {
      assert.deepEqual(saved.data, {
        summary: "Recipe saved.",
        savedRecipes: [{ id: "00000000-0000-4000-8000-000000000001", title: "Lentil soup" }],
      });
    }
  } finally {
    execute.mock.restore();
  }
});
