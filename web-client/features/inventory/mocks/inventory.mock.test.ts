import assert from "node:assert/strict";
import test from "node:test";
import { adjustPortions, createInventory, listInventory, updateInventory } from "./inventory.mock";
import type { InventoryInput } from "../types";

test("inventory mocks isolate results and support create, edit, adjust and remove", async () => {
  const first = await listInventory();
  assert.ok(first[0]);
  first[0].name = "changed";
  assert.notEqual((await listInventory())[0]?.name, "changed");

  const input: InventoryInput = { name: "  Soup  ", storage: "fridge", portions: 2, bestBefore: "2026-03-01", container: "glass", location: "Shelf" };
  const created = await createInventory(input);
  assert.equal(created.name, "Soup");
  const updated = await updateInventory(created.id, { ...input, storage: "freezer", portions: 1 });
  assert.equal(updated.storage, "freezer");
  await adjustPortions({ id: created.id, delta: 1 });
  assert.equal((await listInventory()).find((item) => item.id === created.id)?.portions, 2);
  await adjustPortions({ id: created.id, delta: -1 });
  await adjustPortions({ id: created.id, delta: -1 });
  assert.equal((await listInventory()).find((item) => item.id === created.id), undefined);
  await assert.rejects(adjustPortions({ id: created.id, delta: 1 }), /not found/);
  await assert.rejects(updateInventory(created.id, input), /not found/);
  await assert.rejects(createInventory({ ...input, portions: 0 }));
  await assert.rejects(createInventory({ ...input, bestBefore: "2026-02-30" }));
});
