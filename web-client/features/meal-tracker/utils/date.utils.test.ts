import assert from "node:assert/strict";
import test from "node:test";
import { addLocalDays, toLocalDayRange } from "./date.utils";

test("local day bounds follow both DST transitions", () => {
  const old = process.env.TZ;
  process.env.TZ = "Europe/Budapest";
  try {
    assert.deepEqual(toLocalDayRange("2026-03-29"), {
      from: "2026-03-28T23:00:00.000Z",
      to: "2026-03-29T22:00:00.000Z",
    });

    assert.deepEqual(toLocalDayRange("2026-10-25"), {
      from: "2026-10-24T22:00:00.000Z",
      to: "2026-10-25T23:00:00.000Z",
    });

    test("local bounds include late-night meals in western and eastern offsets", () => {
      const old = process.env.TZ;
      try {
        process.env.TZ = "America/Los_Angeles";
        assert.deepEqual(toLocalDayRange("2026-01-15"), {
          from: "2026-01-15T08:00:00.000Z",
          to: "2026-01-16T08:00:00.000Z",
        });
        process.env.TZ = "Asia/Kathmandu";
        assert.deepEqual(toLocalDayRange("2026-01-15"), {
          from: "2026-01-14T18:15:00.000Z",
          to: "2026-01-15T18:15:00.000Z",
        });
      } finally {
        if (old === undefined) delete process.env.TZ;
        else process.env.TZ = old;
      }
    });
    assert.equal(addLocalDays("2026-03-29", -1), "2026-03-28");
    assert.throws(() => toLocalDayRange("2026-02-30"));
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
