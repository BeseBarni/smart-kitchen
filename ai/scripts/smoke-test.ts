import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { chatService, inventoryItemSchema, recipeSchema } from "@app/modules";
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
  const failure = events.find((event) => event.type === "error");
  if (failure) throw new Error(`${label}: ${failure.message}`);
  assert.ok(events.some((event) => event.type === "turn_completed"), `${label} did not complete`);
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
  const delayMs = Number(process.env.AI_SMOKE_TEST_DELAY_MS ?? "0");
  if (!Number.isSafeInteger(delayMs) || delayMs < 0) {
    throw new Error("AI_SMOKE_TEST_DELAY_MS must be a nonnegative integer.");
  }

  const conversation = await chatService.createConversation(userId, { title: "AI backend smoke test" });
  if (!conversation.success) throw new Error(conversation.error.message);
  const conversationId = conversation.data.id;

  const lookup = await collectTurn(
    userId,
    conversationId,
    "Use the kitchen advisor once to tell me what is in my freezer. Do not change anything or repeat the lookup.",
    "inventory lookup",
  );
  assert.ok(lookup.some((event) => event.type === "tool_call_started"));
  if (delayMs > 0) await delay(delayMs);

  const rescue = await collectTurn(
    userId,
    conversationId,
    "Delegate to the recipe architect and explicitly call the fridge_rescue_skill tool once using the expiring food. Return its result; do not substitute a self-generated draft, save anything, or run additional skills.",
    "fridge rescue",
  );
  assert.ok(rescue.some((event) => event.type === "skill_completed"));
  assert.ok(rescue.some((event) => event.type === "ui_directive"));
  if (delayMs > 0) await delay(delayMs);

  const recipeTitle = `AI Smoke Lentil Soup ${randomUUID().slice(0, 8)}`;
  const proposal = await collectTurn(
    userId,
    conversationId,
    `I would like to save a two-serving recipe named ${recipeTitle}, made by simmering 200 g lentils in 500 ml water, and stock two portions in the pantry. Ask for my confirmation first; do not save or stock anything yet.`,
    "confirm save and stock",
  );
  assert.ok(
    !proposal.some((event) =>
      event.type === "tool_call_completed" && event.success &&
      (event.toolName === "recipes_create" || event.toolName === "recipes_cook_and_stock")
    ),
    "the proposed actions ran before confirmation",
  );
  if (delayMs > 0) await delay(delayMs);
  const multiIntent = await collectTurn(
    userId,
    conversationId,
    `Yes, I approve saving the two-serving recipe ${recipeTitle}: simmer 200 g lentils in 500 ml water. After saving it, use its returned ID to cook two portions and stock them in the pantry. Do not delegate these dependent actions in parallel.`,
    "save and stock",
  );
  for (const toolName of ["recipes_create", "recipes_cook_and_stock"]) {
    assert.ok(
      multiIntent.some((event) =>
        event.type === "tool_call_completed" && event.toolName === toolName && event.success
      ),
      `save and stock did not successfully execute ${toolName}`,
    );
  }

  const ledger = await chatService.getConversationWithItems(userId, conversationId, { limit: 200 });
  if (!ledger.success) throw new Error(ledger.error.message);
  const savedRecipes = ledger.data.items.flatMap((item) => {
    if (item.toolName !== "recipes_create" || item.payload.kind !== "tool_result") return [];
    const parsed = recipeSchema.safeParse(item.payload.result);
    return parsed.success ? [parsed.data] : [];
  });
  const savedRecipe = savedRecipes.find((recipe) => recipe.title === recipeTitle);
  assert.ok(savedRecipe, "the requested recipe was not saved");
  const stockedItems = ledger.data.items.flatMap((item) => {
    if (item.toolName !== "recipes_cook_and_stock" || item.payload.kind !== "tool_result") return [];
    const parsed = inventoryItemSchema.array().safeParse(item.payload.result);
    return parsed.success ? parsed.data : [];
  });
  assert.ok(
    stockedItems.some((item) =>
      item.recipeId === savedRecipe.id && item.storageLocation === "pantry" && item.initialQuantity === 2
    ),
    "two portions of the requested recipe were not stocked in the pantry",
  );
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
