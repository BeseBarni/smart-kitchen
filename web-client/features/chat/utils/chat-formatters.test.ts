import assert from "node:assert/strict";
import test from "node:test";
import { formatChatTime } from "./chat-formatters";

test("formats chat timestamps in the local time zone and selected locale", () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";

  try {
    const timestamp = "2026-01-01T10:00:00Z";
    assert.equal(formatChatTime(timestamp, "en"), "2:00 AM");
    assert.equal(formatChatTime(timestamp, "hu"), "2:00");
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
