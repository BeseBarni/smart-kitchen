import assert from "node:assert/strict";
import { test } from "node:test";
import { createSseStream, encodeSseEvent } from "./sse.encoder";

test("encodes the event discriminator and JSON payload as an SSE frame", () => {
  const event = {
    type: "text_delta" as const,
    delta: "Soup is ready.\nServe hot.",
  };
  const frame = new TextDecoder().decode(encodeSseEvent(event));
  assert.equal(frame, `event: text_delta\ndata: ${JSON.stringify(event)}\n\n`);
});

test("cancelling the response aborts the producer signal", async () => {
  let resolveAbort!: () => void;
  const abortObserved = new Promise<void>((resolve) => {
    resolveAbort = resolve;
  });
  const stream = createSseStream(async (_emit, signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => {
        resolveAbort();
        resolve();
      }, { once: true });
    });
  }, new AbortController().signal);
  const reader = stream.getReader();
  await reader.cancel();
  await abortObserved;
});
