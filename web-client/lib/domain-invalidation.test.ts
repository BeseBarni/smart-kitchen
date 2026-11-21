import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { invalidateAppDomains } from "./domain-invalidation";

test("meal and profile changes invalidate tracker data and existing profile keys", async () => {
  const client = new QueryClient();
  client.setQueryData(["meal-tracker", "summary", "date"], {});
  client.setQueryData(["meal-tracker", "profile"], {});
  client.setQueryData(["profile"], {});
  client.setQueryData(["inventory", "list"], {});
  await invalidateAppDomains(client, ["meal-logs", "profile", "inventory"]);
  for (const key of [["meal-tracker", "summary", "date"], ["meal-tracker", "profile"], ["profile"], ["inventory", "list"]]) {
    assert.equal(client.getQueryState(key)?.isInvalidated, true);
  }
});

test("inventory changes invalidate suggestions without invalidating the daily summary", async () => {
  const client = new QueryClient();
  client.setQueryData(["meal-tracker", "suggestions", "date"], {});
  client.setQueryData(["meal-tracker", "summary", "date"], {});
  await invalidateAppDomains(client, ["inventory"]);
  assert.equal(client.getQueryState(["meal-tracker", "suggestions", "date"])?.isInvalidated, true);
  assert.equal(client.getQueryState(["meal-tracker", "summary", "date"])?.isInvalidated, false);
});
