import assert from "node:assert/strict";
import test from "node:test";
import { createLanguageStore } from "./language.store";
import type { KeyValueStorage } from "./types";

function memory(initial: string | null = null): KeyValueStorage {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
    removeItem: () => { value = null; },
  };
}

test("restores a saved language only after hydration", async () => {
  const storage = memory();
  const first = createLanguageStore(storage, () => {});
  await first.persist.rehydrate();
  first.getState().setLocale("hu");
  const second = createLanguageStore(storage, () => {});
  assert.equal(second.getState().locale, "en");
  assert.equal(second.getState().hasHydrated, false);
  await second.persist.rehydrate();
  assert.equal(second.getState().locale, "hu");
  assert.equal(second.getState().hasHydrated, true);
});

test("reports invalid stored data and remains usable", async () => {
  let failed = false;
  const store = createLanguageStore(memory('{"state":{"locale":"invalid"},"version":0}'), (value) => { failed = value; });
  const log = console.error;
  console.error = () => {};
  try { await store.persist.rehydrate(); } finally { console.error = log; }
  assert.equal(store.getState().locale, "en");
  assert.equal(store.getState().hasHydrated, true);
  assert.equal(failed, true);
  store.getState().setLocale("es");
  assert.equal(store.getState().locale, "es");
  assert.equal(failed, false);
});

test("reports failed writes while keeping the session language", async () => {
  let failed = false;
  const store = createLanguageStore({
    getItem: () => null,
    setItem: () => { throw new Error("unavailable"); },
    removeItem: () => {},
  }, (value) => { failed = value; });
  await store.persist.rehydrate();
  const log = console.error;
  console.error = () => {};
  try { store.getState().setLocale("es"); } finally { console.error = log; }
  assert.equal(store.getState().locale, "es");
  assert.equal(failed, true);
});

test("restores an asynchronously stored locale", async () => {
  const store = createLanguageStore({
    getItem: async () => '{"state":{"locale":"es"},"version":0}',
    setItem: async () => {},
    removeItem: async () => {},
  }, () => {});
  await store.persist.rehydrate();
  assert.equal(store.getState().locale, "es");
  assert.equal(store.getState().hasHydrated, true);
});
