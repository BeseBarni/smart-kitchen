import type { AgentStreamEvent } from "./stream.types";

const encoder = new TextEncoder();

export function encodeSseEvent(event: AgentStreamEvent): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function createSseStream(
  producer: (emit: (event: AgentStreamEvent) => void, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const abortController = new AbortController();
  const abortFromRequest = () => abortController.abort(signal.reason);
  if (signal.aborted) abortFromRequest();
  else signal.addEventListener("abort", abortFromRequest, { once: true });

  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      const emit = (event: AgentStreamEvent) => {
        if (!cancelled && !abortController.signal.aborted) controller.enqueue(encodeSseEvent(event));
      };
      void producer(emit, abortController.signal).then(
        () => {
          if (!cancelled) controller.close();
        },
        (error: unknown) => {
          if (!cancelled) controller.error(error);
        },
      ).finally(() => {
        signal.removeEventListener("abort", abortFromRequest);
      });
    },
    cancel(reason) {
      cancelled = true;
      abortController.abort(reason);
      signal.removeEventListener("abort", abortFromRequest);
    },
  });
}
