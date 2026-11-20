import assert from "node:assert/strict";
import { test } from "node:test";
import { assistantMessagePayload } from "./runner";

test("assistant ledger payload preserves UI directives for history rendering", () => {
  const directive = {
    component: "inventory_action_card" as const,
    action: "added" as const,
    items: [{ id: "item-1", name: "Soup", quantity: 2, unit: "portion", location: "freezer" as const }],
  };
  assert.deepEqual(assistantMessagePayload("Added soup.", [directive]), {
    kind: "message",
    text: "Added soup.",
    uiDirectives: [directive],
  });
});

test("assistant ledger payload omits the optional directives field when empty", () => {
  assert.deepEqual(assistantMessagePayload("Hello.", []), {
    kind: "message",
    text: "Hello.",
  });
});
