import {
  chatService,
  chatJsonValueSchema,
  type ConversationItemPayloadDto,
  type ConversationStreamInput,
} from "@app/modules";
import { err, ok, type AppError, type Result } from "@app/shared";
import { FAST_MODEL } from "./core/llm.client";
import { createSseStream } from "./core/sse.encoder";
import type { AgentStreamEvent, UiDirectiveEvent } from "./core/stream.types";
import type { UiDirective } from "./core/ui.types";
import { orchestratorAgent } from "./agents/orchestrator.agent";
import { generateConversationTitle } from "./agents/conversation-title";
import { isKitchenMessage } from "./agents/chat-restriction";
import { isSafeKitchenMessage } from "./agents/kitchen-safety";
import type { AgentContext, LedgerItem } from "./agents/agent.types";
import { executeVisionExtractor, visionSkillImages, type VisionExtractorOutput } from "./skills/vision-extractor.skill";

function jsonDirectives(directives: UiDirective[]) {
  const encoded = JSON.stringify(directives);
  if (encoded === undefined) throw new Error("UI directives are not JSON serializable.");
  return chatJsonValueSchema.array().parse(JSON.parse(encoded));
}

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "The AI turn failed unexpectedly.";
}

export function createTurnEmitter(send: (event: AgentStreamEvent) => void): {
  directives: UiDirective[];
  emit: (event: AgentStreamEvent) => void;
  emitReceipt: (directive: Extract<UiDirective, { component: "receipt_import_card" }>) => void;
} {
  const directives: UiDirective[] = [];
  let automaticReceiptPresented = false;
  const emit = (event: AgentStreamEvent): void => {
    if (event.type === "ui_directive") {
      if (automaticReceiptPresented && event.directive.component === "receipt_import_card") return;
      directives.push(event.directive);
    }
    send(event);
  };
  const emitReceipt = (directive: Extract<UiDirective, { component: "receipt_import_card" }>): void => {
    const event: UiDirectiveEvent = { type: "ui_directive", directive, invalidateDomains: [] };
    emit(event);
    automaticReceiptPresented = true;
  };
  return { directives, emit, emitReceipt };
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

export function receiptImportDirective(
  output: Extract<VisionExtractorOutput, { kind: "receipt" }>,
): Extract<UiDirective, { component: "receipt_import_card" }> {
  return {
    component: "receipt_import_card",
    merchant: output.merchant,
    purchasedAt: output.purchasedAt,
    currency: output.currency,
    totalAmount: output.totalAmount,
    items: output.lineItems.filter((item) => item.isFoodItem).map((item, index) => ({
      tempId: `receipt-${index}`,
      name: item.normalizedName,
      quantity: item.quantity,
      unit: item.unit,
      priceAmount: item.unitPrice ?? (item.totalPrice != null ? item.totalPrice / item.quantity : null),
      storageLocation: item.suggestedStorageLocation,
      estimatedShelfLifeDays: item.estimatedShelfLifeDays,
      expiresAt: item.expiresAt,
      shelfLifeDays: item.shelfLifeDays,
      estimatedMacrosPerUnit: item.estimatedMacrosPerUnit,
      isFoodItem: item.isFoodItem,
      confidence: item.confidence,
    })),
  };
}

export async function runStreamingTurn(input: {
  userId: string;
  conversationId: string;
  userMessage: ConversationStreamInput;
  abortSignal: AbortSignal;
}): Promise<Result<ReadableStream<Uint8Array>, AppError>> {
  const userCaption = input.userMessage.message?.trim() ?? "";
  const taskText = userCaption || (input.userMessage.attachments?.length
    ? "Analyze the attached kitchen photo."
    : "");
  const existing = await chatService.getConversationWithItems(input.userId, input.conversationId, { limit: 1 });
  if (!existing.success) return err(existing.error);
  const recent = await chatService.getRecentContextItems(input.userId, input.conversationId, { maxItems: 20 });
  if (!recent.success) return err(recent.error);
  const recentMessages = recent.data.flatMap((item) =>
    item.type === "message" && item.payload.kind === "message" &&
    (item.role === "user" || item.role === "assistant")
      ? [{ role: item.role, text: item.payload.text.slice(0, 2000) }]
      : [],
  ).slice(-4);
  const allowed = await isKitchenMessage({
    message: taskText,
    recentMessages,
    abortSignal: input.abortSignal,
  });
  if (!allowed) {
    return err({
      code: "VALIDATION_ERROR",
      message: "Please keep messages related to food, cooking, or your kitchen.",
      details: { reason: "off_topic" },
    });
  }
  const safe = await isSafeKitchenMessage({
    message: taskText,
    recentMessages,
    abortSignal: input.abortSignal,
  });
  if (!safe) {
    return err({
      code: "VALIDATION_ERROR",
      message: "This request was rejected because it may involve an unsafe kitchen practice.",
      details: { reason: "unsafe_kitchen" },
    });
  }
  input.abortSignal.throwIfAborted();
  const attachmentMetadata = input.userMessage.attachments?.map((attachment) => ({
    name: attachment.name,
    mimeType: attachment.mimeType,
    ...(attachment.width ? { width: attachment.width } : {}),
    ...(attachment.height ? { height: attachment.height } : {}),
    ...(attachment.sizeBytes ? { sizeBytes: attachment.sizeBytes } : {}),
  }));
  const userItem = await chatService.appendItems(input.userId, input.conversationId, [{
    type: "message",
    role: "user",
    payload: {
      kind: "message",
      text: userCaption,
      attachments: attachmentMetadata,
    },
  }]);
  if (!userItem.success) return err(userItem.error);
  const persistedUserItem = userItem.data[0];
  if (!persistedUserItem) throw new Error("The user message was not persisted.");

  const isFirstMessage = existing.data.conversation.title === null && persistedUserItem.sequence === 1;
  const turnId = persistedUserItem.id;
  return ok(createSseStream(async (send, signal) => {
    const startedAt = Date.now();
    const { directives, emit, emitReceipt } = createTurnEmitter(send);
    const context: AgentContext = {
      userId: input.userId,
      conversationId: input.conversationId,
      locale: input.userMessage.locale ?? "en",
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
        const title = await generateConversationTitle(taskText, undefined, context.locale);
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
      if (input.userMessage.attachments?.length) {
        emit({
          type: "agent_status",
          agent: "vision_extractor",
          status: "analyzing_image",
          label: "Analyzing photo...",
        });
        const extraction = await executeVisionExtractor({
          images: visionSkillImages(input.userMessage.attachments),
          userCaption: userCaption || undefined,
          userLocale: context.locale,
          defaultCurrency: "HUF",
        });
        if (!extraction.success) throw new Error(extraction.error.message);
        const output = extraction.data.output;
        context.usage.inputTokens += extraction.data.usage.inputTokens;
        context.usage.outputTokens += extraction.data.usage.outputTokens;
        const ledgerInput = chatJsonValueSchema.parse({
          count: input.userMessage.attachments.length,
          mimeTypes: input.userMessage.attachments.map((attachment) => attachment.mimeType),
          caption: userCaption || null,
        });
        const ledgerOutput = chatJsonValueSchema.parse(JSON.parse(JSON.stringify(output)));
        await context.recordLedger([{
          type: "skill_execution",
          role: "assistant",
          toolName: "vision_extractor",
          payload: {
            kind: "skill_execution",
            input: ledgerInput,
            output: ledgerOutput,
          },
          metadata: {
            model: process.env.AI_VISION_MODEL ?? "gemini-3.5-flash",
            inputTokens: extraction.data.usage.inputTokens,
            outputTokens: extraction.data.usage.outputTokens,
            latencyMs: extraction.data.latencyMs,
          },
        }]);
        emit({ type: "skill_completed", skillName: "vision_extractor", latencyMs: extraction.data.latencyMs });

        if (output.kind === "receipt") {
          emitReceipt(receiptImportDirective(output));
        }
      }
      const result = await orchestratorAgent.execute(
        { task: taskText },
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
