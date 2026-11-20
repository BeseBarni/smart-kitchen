import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

type WorkerEvent = {
  request?: { url: string; mode: string };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
};

function setupWorker(network: () => Promise<Response>) {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const added: string[] = [];
  const deleted: string[] = [];
  const offline = new Response("Offline");
  const cache = {
    add: async (url: string) => { added.push(url); },
    match: async (url: string) => url === "/offline.html" ? offline : undefined,
  };
  const caches = {
    open: async () => cache,
    keys: async () => ["preppilot-offline-v1", "preppilot-offline-old", "other-app"],
    delete: async (name: string) => { deleted.push(name); },
  };
  const self = {
    location: { origin: "https://example.test" },
    clients: { claim: async () => {} },
    addEventListener: (name: string, handler: (event: WorkerEvent) => void) => handlers.set(name, handler),
  };
  runInNewContext(readFileSync(resolve("web-client/public/sw.js"), "utf8"), {
    self, caches, fetch: network, URL, Response,
  });
  return { handlers, added, deleted, offline };
}

test("pre-caches only the offline page and removes only old app caches", async () => {
  const worker = setupWorker(async () => new Response("Online"));
  let pending: Promise<unknown> = Promise.resolve();
  const event: WorkerEvent = { waitUntil: (promise) => { pending = promise; }, respondWith: () => {} };
  worker.handlers.get("install")?.(event);
  await pending;
  assert.deepEqual(worker.added, ["/offline.html"]);
  worker.handlers.get("activate")?.(event);
  await pending;
  assert.deepEqual(worker.deleted, ["preppilot-offline-old"]);
});

test("uses the offline fallback only for failed same-origin page navigation", async () => {
  const worker = setupWorker(async () => { throw new Error("offline"); });
  let response: Promise<Response> | undefined;
  const event: WorkerEvent = {
    request: { url: "https://example.test/chat", mode: "navigate" },
    waitUntil: () => {},
    respondWith: (promise) => { response = promise; },
  };
  worker.handlers.get("fetch")?.(event);
  assert.equal(await response, worker.offline);
  for (const request of [
    { url: "https://example.test/api/chat", mode: "navigate" },
    { url: "https://example.test/chat", mode: "cors" },
    { url: "https://other.test/chat", mode: "navigate" },
  ]) {
    response = undefined;
    worker.handlers.get("fetch")?.({ ...event, request });
    assert.equal(response, undefined);
  }
});

test("passes online navigation responses through without caching them", async () => {
  const online = new Response("private page");
  const worker = setupWorker(async () => online);
  let response: Promise<Response> | undefined;
  worker.handlers.get("fetch")?.({
    request: { url: "https://example.test/chat", mode: "navigate" },
    waitUntil: () => {},
    respondWith: (promise) => { response = promise; },
  });
  assert.equal(await response, online);
  assert.deepEqual(worker.added, []);
});
