import assert from "node:assert/strict";
import { chatService } from "@app/modules";
import { runStreamingTurn } from "../runner";
import type { AgentStreamEvent } from "../core/stream.types";

async function collectTurn(
  userId: string,
  conversationId: string,
  message: string,
  label: string,
): Promise<AgentStreamEvent[]> {
  const result = await runStreamingTurn({
    userId,
    conversationId,
    userMessage: { message },
    abortSignal: new AbortController().signal,
  });
  if (!result.success) throw new Error(result.error.message);

  const events: AgentStreamEvent[] = [];
  const reader = result.data.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame.split("\n").find((line) => line.startsWith("data: "));
      if (data) {
        const event = JSON.parse(data.slice(6)) as AgentStreamEvent;
        events.push(event);
        console.log(`${label}: ${event.type}`);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
  assert.ok(events.some((event) => event.type === "turn_completed"), `${label} did not complete`);
  assert.ok(!events.some((event) => event.type === "error"), `${label} emitted an error`);
  return events;
}

async function main(): Promise<void> {
  const userId = process.env.AI_SMOKE_TEST_USER_ID;
  if (!userId) throw new Error("AI_SMOKE_TEST_USER_ID must identify a seeded development user.");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error("Set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY to run the smoke test.");
  }
  if (process.env.AI_SMOKE_TEST_ALLOW_MUTATIONS !== "true") {
    throw new Error("Set AI_SMOKE_TEST_ALLOW_MUTATIONS=true only for a disposable development database.");
  }

  const conversation = await chatService.createConversation(userId, { title: "AI backend smoke test" });
  if (!conversation.success) throw new Error(conversation.error.message);
  const conversationId = conversation.data.id;

  const lookup = await collectTurn(
    userId,
    conversationId,
    "Use the kitchen advisor to tell me what is in my freezer. Do not change anything.",
    "inventory lookup",
  );
  assert.ok(lookup.some((event) => event.type === "tool_call_started"));

  const rescue = await collectTurn(
    userId,
    conversationId,
    "Use FridgeRescueSkill to inspect expiring food and present a rescue meal draft. Do not save it.",
    "fridge rescue",
  );
  assert.ok(rescue.some((event) => event.type === "skill_completed"));
  assert.ok(rescue.some((event) => event.type === "ui_directive"));

  const multiIntent = await collectTurn(
    userId,
    conversationId,
    "Create and save a simple two-serving recipe named AI Smoke Lentil Soup, then cook two portions and stock them in the pantry. I explicitly approve both actions.",
    "save and stock",
  );
  assert.ok(multiIntent.some((event) => event.type === "tool_call_completed"));

  const ledger = await chatService.getConversationWithItems(userId, conversationId, { limit: 200 });
  if (!ledger.success) throw new Error(ledger.error.message);
  assert.ok(ledger.data.items.some((item) => item.type === "tool_call"));
  assert.ok(ledger.data.items.some((item) => item.type === "skill_execution"));
  assert.ok(ledger.data.items.some((item) =>
    item.type === "message" && item.role === "assistant" &&
    item.payload.kind === "message" && (item.payload.uiDirectives?.length ?? 0) > 0
  ));
  console.log(`Smoke test passed for conversation ${conversationId}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Smoke test failed.");
  process.exitCode = 1;
});
