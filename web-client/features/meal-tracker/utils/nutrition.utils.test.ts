import assert from "node:assert/strict";
import test from "node:test";
import { percentage } from "./nutrition.utils";

test("progress handles unset and exceeded targets", () => {
  assert.equal(percentage(10, null), null);
  assert.equal(percentage(10, 0), null);
  assert.equal(percentage(250, 200), 100);
  assert.equal(percentage(-10, 100), 0);
});
