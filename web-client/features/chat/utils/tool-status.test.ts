import assert from "node:assert/strict";
import test from "node:test";
import { toolStatusLabel } from "./tool-status";

test("uses friendly activity descriptions without exposing tool identifiers", () => {
  assert.equal(toolStatusLabel("meal_prep_architect_skill"), "Creating your meal prep recipe...");
  assert.equal(toolStatusLabel("profile_get"), "Checking your preferences...");
  assert.equal(toolStatusLabel("unrecognized_internal_tool"), "Working on your request...");
});
