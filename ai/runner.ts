import { randomUUID } from "node:crypto";
import {
  chatService,
  chatJsonValueSchema,
  type ConversationItemPayloadDto,
  type ConversationStreamInput,
} from "@app/modules";
import { err, ok, type AppError, type Result } from "@app/shared";
import { FAST_MODEL } from "./core/llm.client";
import { createSseStream } from "./core/sse.encoder";
import type { AgentStreamEvent } from "./core/stream.types";
import type { UiDirective } from "./core/ui.types";
import { orchestratorAgent } from "./agents/orchestrator.agent";
import { generateConversationTitle } from "./agents/conversation-title";
import type { AgentContext, LedgerItem } from "./agents/agent.types";

function jsonDirectives(directives: UiDirective[]) {
  const encoded = JSON.stringify(directives);
  if (encoded === undefined) throw new Error("UI directives are not JSON serializable.");
  return chatJsonValueSchema.array().parse(JSON.parse(encoded));
}

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "The AI turn failed unexpectedly.";
}

export function assistantMessagePayload(
  text: string,
  directives: UiDirective[],
): Extract<ConversationItemPayloadDto, { kind: "message" }> {
  const uiDirectives = jsonDirectives(directives);
  return {
    kind: "message",
    text,
    ...(directives.length > 0 ? { uiDirectives } : {}),
  };
}

export async function runStreamingTurn(input: {
  userId: string;
  conversationId: string;
  userMessage: ConversationStreamInput;
  abortSignal: AbortSignal;
}): Promise<Result<ReadableStream<Uint8Array>, AppError>> {
  const existing = await chatService.getConversationWithItems(input.userId, input.conversationId, { limit: 1 });
  if (!existing.success) return err(existing.error);
  const userItem = await chatService.appendItems(input.userId, input.conversationId, [{
    type: "message",
    role: "user",
    payload: {
      kind: "message",
      text: input.userMessage.message,
      attachments: input.userMessage.attachments,
    },
  }]);
  if (!userItem.success) return err(userItem.error);

  const isFirstMessage = existing.data.conversation.title === null && userItem.data[0]?.sequence === 1;
  const turnId = randomUUID();
  return ok(createSseStream(async (send, signal) => {
    const startedAt = Date.now();
    const directives: UiDirective[] = [];
    const emit = (event: AgentStreamEvent) => {
      if (event.type === "ui_directive") directives.push(event.directive);
      send(event);
    };
    const context: AgentContext = {
      userId: input.userId,
      conversationId: input.conversationId,
      abortSignal: signal,
      emit,
      usage: { inputTokens: 0, outputTokens: 0 },
      ledgerItems: [],
      recordLedger: async (items: LedgerItem[]) => {
        const result = await chatService.appendItems(input.userId, input.conversationId, items);
        if (!result.success) throw new Error(result.error.message);
        context.ledgerItems.push(...items);
      },
    };

    emit({ type: "turn_started", conversationId: input.conversationId, turnId });
    const titleUpdate = isFirstMessage ? (async () => {
      try {
        const title = await generateConversationTitle(input.userMessage.message);
        const updated = await chatService.updateTitleIfUntitled(input.userId, input.conversationId, title);
        if (!updated.success) {
          console.error("Conversation title update failed:", updated.error.message);
        } else if (updated.data.updated) {
          emit({ type: "conversation_title_updated", conversationId: input.conversationId });
        }
      } catch (error) {
        console.error("Conversation title generation failed:", failureMessage(error));
      }
    })() : Promise.resolve();
    try {
      const result = await orchestratorAgent.execute(
        { task: input.userMessage.message },
        context,
      );
      if (signal.aborted) return;
      if (result.summary.trim().length === 0) {
        throw new Error("The orchestrator completed without a user-facing response.");
      }

      const finalItem = await chatService.appendItems(input.userId, input.conversationId, [{
        type: "message",
        role: "assistant",
        payload: assistantMessagePayload(result.summary, directives),
        metadata: {
          model: process.env.AI_MODEL ?? FAST_MODEL,
          inputTokens: context.usage.inputTokens,
          outputTokens: context.usage.outputTokens,
          latencyMs: Date.now() - startedAt,
        },
      }]);
      if (!finalItem.success) throw new Error(finalItem.error.message);

      await titleUpdate;
      emit({
        type: "turn_completed",
        conversationId: input.conversationId,
        usage: context.usage,
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (signal.aborted) return;
      console.error("AI turn failed:", failureMessage(error));
      emit({
        type: "error",
        code: "INTERNAL_ERROR",
        message: "The assistant couldn't finish this response. Please try again.",
        recoverable: true,
      });
    } finally {
      await titleUpdate;
    }
  }, input.abortSignal));
}
