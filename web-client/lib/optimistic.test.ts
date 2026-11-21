import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  createOptimisticId,
  isOptimisticId,
  snapshotQueryCaches,
} from "./optimistic";

test("optimistic IDs are temporary and distinct", () => {
  const first = createOptimisticId();
  const second = createOptimisticId();
  assert.equal(isOptimisticId(first), true);
  assert.equal(isOptimisticId(second), true);
  assert.notEqual(first, second);
  assert.equal(isOptimisticId("6df2c2d8-b1d7-4d48-9a2f-c7a7a9f0f0f0"), false);
});

test("snapshot rollback restores every matching query cache entry", async () => {
  const client = new QueryClient();
  client.setQueryData(["inventory", "list", { storageLocation: "fridge" }], ["fridge-item"]);
  client.setQueryData(["inventory", "list", { storageLocation: "freezer" }], ["freezer-item"]);
  const snapshot = await snapshotQueryCaches(client, [["inventory", "list"]]);

  client.setQueryData(["inventory", "list", { storageLocation: "fridge" }], ["changed"]);
  snapshot.rollback();

  assert.deepEqual(
    client.getQueryData(["inventory", "list", { storageLocation: "fridge" }]),
    ["fridge-item"],
  );
  assert.deepEqual(
    client.getQueryData(["inventory", "list", { storageLocation: "freezer" }]),
    ["freezer-item"],
  );
});
