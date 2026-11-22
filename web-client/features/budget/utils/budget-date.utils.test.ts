import assert from "node:assert/strict";
import test from "node:test";
import { monthInfo, toLocalMonthRange } from "./budget-date.utils";

test("month range uses exact UTC month boundaries", () => {
  assert.deepEqual(toLocalMonthRange("2026-12"), {
    from: "2026-12-01T00:00:00.000Z",
    to: "2027-01-01T00:00:00.000Z",
  });
});

test("month info reports the selected month length", () => {
  const info = monthInfo("2025-11");
  assert.equal(info.daysInMonth, 30);
  assert.equal(info.currentDay, 30);
  assert.equal(info.progressPercent, 100);
});
