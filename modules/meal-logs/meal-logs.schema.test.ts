import assert from "node:assert/strict";
import test from "node:test";
import { dailySummaryQuerySchema } from "./meal-logs.schema";

test("daily summary accepts legacy dates and DST-length local days", () => {
  assert.equal(dailySummaryQuerySchema.safeParse({ date: "2026-03-29" }).success, true);
  assert.equal(dailySummaryQuerySchema.safeParse({
    date: "2026-03-29",
    from: "2026-03-28T23:00:00.000Z",
    to: "2026-03-29T22:00:00.000Z",
  }).success, true);
  assert.equal(dailySummaryQuerySchema.safeParse({
    date: "2026-10-25",
    from: "2026-10-24T22:00:00.000Z",
    to: "2026-10-25T23:00:00.000Z",
  }).success, true);
});

test("daily summary rejects partial, reversed and excessive ranges", () => {
  const from = "2026-03-28T23:00:00.000Z";
  assert.equal(dailySummaryQuerySchema.safeParse({ date: "2026-03-29", from }).success, false);
  assert.equal(dailySummaryQuerySchema.safeParse({ date: "2026-03-29", from, to: from }).success, false);
  assert.equal(dailySummaryQuerySchema.safeParse({
    date: "2026-03-29", from, to: "2026-03-31T23:00:01.000Z",
  }).success, false);
});
