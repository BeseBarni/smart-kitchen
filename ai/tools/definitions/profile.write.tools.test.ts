import assert from "node:assert/strict";
import test from "node:test";
import { profileUpdateTargetsTool } from "./profile.write.tools";
import { executeToolCall } from "../adapters/vercel.adapter";
import type { AgentStreamEvent } from "../../core/stream.types";
import { agentStreamEventSchema } from "../../core/stream.schema";

test("target tool rejects empty, negative, and unrelated changes", () => {
  const schema = profileUpdateTargetsTool.inputSchema;
  assert.equal(schema.safeParse({}).success, false);
  assert.equal(schema.safeParse({ dailyFiberG: -1 }).success, false);
  assert.equal(schema.safeParse({ dietaryPreferences: null }).success, false);
  assert.equal(schema.safeParse({ dailyCalorieTarget: 2000, dailyFiberG: 30 }).success, true);
  assert.equal(profileUpdateTargetsTool.annotations.readOnlyHint, true);
});

test("target proposals emit a confirmation rather than updating or invalidating the profile", async () => {
  const events: AgentStreamEvent[] = [];
  const targets = { dailyCalorieTarget: 2000, dailyFiberG: 30 };
  const result = await executeToolCall(profileUpdateTargetsTool, targets, {
    userId: "test-user", agent: "orchestrator", emit: (event) => events.push(event),
    recordLedger: async () => {},
  }, "proposal");
  assert.equal(result.success, true);
  const directive = events.find((event) => event.type === "ui_directive");
  assert.deepEqual(directive?.directive, { component: "profile_targets_confirmation", targets });
  assert.deepEqual(directive?.invalidateDomains, []);
  assert.equal(agentStreamEventSchema.safeParse(directive).success, true);
});
