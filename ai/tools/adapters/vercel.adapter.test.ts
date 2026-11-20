import assert from "node:assert/strict";
import { test } from "node:test";
import { err, ok } from "@app/shared";
import { z } from "zod";
import type { LedgerItem } from "../definitions/tool.types";
import { defineTool } from "../definitions/tool.types";
import { presentRecommendationsTool, requestConfirmationTool } from "../definitions/ui.tools";
import { executeToolCall, toVercelTools } from "./vercel.adapter";

test("executes a validated tool and emits lifecycle and UI events", async () => {
  const toolDefinition = defineTool({
    name: "inventory_add_item",
    description: "Add one test item.",
    inputSchema: z.object({ name: z.string().describe("Item name.") }).strict(),
    outputSchema: z.object({ name: z.string() }).strict(),
    annotations: { idempotentHint: false },
    invalidateDomains: ["inventory"],
    execute: async ({ name }) => ok({ name }),
    toUiDirective: ({ name }) => ({
      component: "inventory_action_card",
      action: "added",
      items: [{ id: "item-1", name, quantity: 1, unit: "portion", location: "fridge" }],
    }),
  });
  const events: Array<{ type: string }> = [];
  const ledger: LedgerItem[] = [];
  const result = await executeToolCall(
    toolDefinition,
    { name: "Soup" },
    {
      userId: "user-1",
      agent: "inventory_ops",
      emit: (event) => events.push(event),
      recordLedger: async (items) => {
        ledger.push(...items);
      },
    },
    "call-1",
  );
  assert.equal(result.success, true);
  assert.deepEqual(events.map((event) => event.type), [
    "agent_status",
    "tool_call_started",
    "ui_directive",
    "tool_call_completed",
  ]);
  assert.deepEqual(ledger.map((item) => item.type), ["tool_call", "tool_result"]);
  assert.equal(ledger[0]?.callId, ledger[1]?.callId);
});

test("returns service errors as tool outcomes without emitting a UI directive", async () => {
  const toolDefinition = defineTool({
    name: "inventory_discard_item",
    description: "Discard one item.",
    inputSchema: z.object({ itemId: z.string().describe("Item ID.") }).strict(),
    annotations: { destructiveHint: true },
    execute: async () => err({ code: "ITEM_NOT_FOUND", message: "Not found." }),
  });

  const events: Array<{ type: string }> = [];
  const result = await executeToolCall(
    toolDefinition,
    { itemId: "missing" },
    {
      userId: "user-1",
      agent: "inventory_ops",
      emit: (event) => events.push(event),
      recordLedger: async () => {},
    },
    "call-2",
  );
  assert.equal(result.success, false);
  assert.deepEqual(events.map((event) => event.type), [
    "agent_status",
    "tool_call_started",
    "tool_call_completed",
  ]);
});

test("confirmation uses a nonrecursive model schema while validating JSON inputs", async () => {
  const context = {
    userId: "user-1",
    agent: "inventory_ops" as const,
    emit: () => {},
    recordLedger: async () => {},
  };
  const adapted = toVercelTools([requestConfirmationTool], context);
  assert.ok(adapted.ui_request_confirmation);
  assert.ok(requestConfirmationTool.modelInputSchema);
  assert.equal(adapted.ui_request_confirmation.inputSchema, requestConfirmationTool.modelInputSchema);
  assert.equal(JSON.stringify(z.toJSONSchema(requestConfirmationTool.modelInputSchema)).includes('"$ref"'), false);

  const input = {
    actionId: "discard",
    title: "Discard food",
    description: "Discard the selected item.",
    confirmLabel: "Discard",
    payload: { item: { id: "item-1", portions: [1, 2] } },
  };
  assert.equal((await executeToolCall(requestConfirmationTool, input, context, "valid")).success, true);
  const invalid = await executeToolCall(
    requestConfirmationTool,
    { ...input, payload: { quantity: Infinity } },
    context,
    "invalid",
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.equal(invalid.error.code, "VALIDATION_ERROR");
});

test("recommendation tool emits validated chips and rejects invalid suggestions", async () => {
  const events: import("../../core/stream.types").AgentStreamEvent[] = [];
  const context = {
    userId: "user-1",
    agent: "orchestrator" as const,
    emit: (event: import("../../core/stream.types").AgentStreamEvent) => events.push(event),
    recordLedger: async () => {},
  };
  const recommendations = ["Suggest a side dish", "Make it vegetarian"];
  const valid = await executeToolCall(presentRecommendationsTool, { recommendations }, context, "chips");
  assert.equal(valid.success, true);
  const directive = events.find((event) => event.type === "ui_directive");
  assert.deepEqual(directive?.directive, { component: "recommendation_chips", recommendations });
  const invalid = await presentRecommendationsTool.execute({ recommendations: [] }, context);
  assert.equal(invalid.success, false);
});
