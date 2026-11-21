import { uiDirectiveSchema } from "@app/ai/stream-schema";
import type { ChatJsonValue, ConversationItemDto } from "@app/modules/schemas";
import type { ChatTurn, ChatToolStep } from "../types";
import type { ChatAttachment } from "../types";

function persistedAttachmentMime(mimeType: string): ChatAttachment["mimeType"] {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  if (mimeType === "image/heic") return "image/heic";
  if (mimeType === "image/heif") return "image/heif";
  return "image/jpeg";
}

function jsonSummary(value: ChatJsonValue | undefined): string {
  if (value === undefined) return "Completed";
  if (typeof value === "object" && value !== null && !Array.isArray(value) &&
      "summary" in value && typeof value.summary === "string") {
    return value.summary;
  }
  return JSON.stringify(value);
}

function createTurn(id: string, createdAt: string, text = ""): ChatTurn {
  return {
    id,
    ...(text ? { userMessage: { id: `${id}-user`, role: "user", text, createdAt } } : {}),
    assistantMessage: { id: `${id}-assistant`, role: "assistant", text: "", createdAt },
    toolSteps: [],
    uiDirectives: [],
    activeStatus: null,
  };
}

export function mapConversationHistory(items: readonly ConversationItemDto[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  const legacyRecipes = new Map<ChatTurn, ChatTurn["uiDirectives"]>();
  const receiptExtractionTurns = new Set<ChatTurn>();
  let current: ChatTurn | undefined;
  const ensureTurn = (id: string, createdAt: string): ChatTurn => {
    if (!current) {
      current = createTurn(id, createdAt);
      turns.push(current);
    }
    return current;
  };

  for (const item of items) {
    if (item.type === "message" && item.payload.kind === "message") {
      if (item.role === "user") {
        current = createTurn(item.id, item.createdAt, item.payload.text);
        if (item.payload.attachments?.length) {
          current.userMessage = {
            ...current.userMessage!,
            attachments: item.payload.attachments.map((attachment, index) => ({
              id: attachment.assetId ?? `${item.id}-attachment-${index}`,
              assetId: attachment.assetId,
              name: attachment.name ?? "photo",
              mimeType: persistedAttachmentMime(attachment.mimeType),
              previewUrl: attachment.assetId
                ? `/api/media/${attachment.assetId}/file`
                : attachment.url,
              width: attachment.width,
              height: attachment.height,
              sizeBytes: attachment.sizeBytes,
            })),
          };
        }
        turns.push(current);
      } else if (item.role === "assistant") {
        const turn = ensureTurn(item.id, item.createdAt);
        turn.assistantMessage = {
          ...turn.assistantMessage,
          text: turn.assistantMessage.text + item.payload.text,
          createdAt: item.createdAt,
        };
        for (const [directiveIndex, directive] of (item.payload.uiDirectives ?? []).entries()) {
          const parsed = uiDirectiveSchema.parse(directive);
          if (receiptExtractionTurns.has(turn) && parsed.component === "receipt_import_card" &&
              turn.uiDirectives.some((existing) => existing.component === "receipt_import_card")) continue;
          if (parsed.component === "receipt_import_card") {
            turn.receiptSources ??= {};
            turn.receiptSources[turn.uiDirectives.length] = {
              conversationId: item.conversationId,
              itemId: item.id,
              directiveIndex,
              imported: item.payload.importedReceiptIndexes?.includes(directiveIndex) ?? false,
            };
          }
          turn.uiDirectives.push(parsed);
        }
      }
      continue;
    }

    const turn = ensureTurn(item.id, item.createdAt);
    if (item.type === "tool_call" && item.payload.kind === "tool_call") {
      if (!item.callId || !item.toolName) throw new Error("Persisted tool call is missing its correlation data.");
      const step: ChatToolStep = {
        id: item.callId,
        agent: null,
        toolName: item.toolName,
        argsSummary: JSON.stringify(item.payload.arguments).slice(0, 120),
        status: "running",
        summary: "Running",
      };
      turn.toolSteps.push(step);
    } else if (item.type === "tool_result" && item.payload.kind === "tool_result") {
      if (!item.callId || !item.toolName) throw new Error("Persisted tool result is missing its correlation data.");
      if (item.toolName === "ui_present_recipe_draft" && !item.payload.error) {
        const recipe = uiDirectiveSchema.safeParse({
          component: "recipe_preview_card",
          status: "draft",
          recipe: item.payload.result,
          canSave: true,
          canCookAndStock: false,
        });
        if (recipe.success) legacyRecipes.set(turn, [...(legacyRecipes.get(turn) ?? []), recipe.data]);
      }
      const stepIndex = turn.toolSteps.findIndex((entry) => entry.id === item.callId);
      const resultSummary = item.payload.error
        ? item.payload.error.message
        : jsonSummary(item.payload.result);
      if (stepIndex < 0) {
        turn.toolSteps.push({
          id: item.callId,
          agent: null,
          toolName: item.toolName,
          argsSummary: "",
          status: item.payload.error ? "failed" : "completed",
          summary: resultSummary,
        });
      } else {
        const existing = turn.toolSteps[stepIndex];
        if (existing) turn.toolSteps[stepIndex] = {
          ...existing,
          status: item.payload.error ? "failed" : "completed",
          summary: resultSummary,
        };
      }
    } else if (item.type === "skill_execution" && item.payload.kind === "skill_execution") {
      const output = item.payload.output;
      if (item.toolName === "vision_extractor" && typeof output === "object" && output !== null &&
          !Array.isArray(output) && "kind" in output && output.kind === "receipt") {
        receiptExtractionTurns.add(turn);
      }
      turn.toolSteps.push({
        id: item.id,
        agent: null,
        toolName: item.toolName ?? "Skill",
        argsSummary: JSON.stringify(item.payload.input).slice(0, 120),
        status: "completed",
        summary: JSON.stringify(item.payload.output),
      });
    }
  }
  for (const turn of turns) {
    if (turn.assistantMessage.text && !turn.uiDirectives.some((directive) => directive.component === "recipe_preview_card")) {
      turn.uiDirectives.push(...(legacyRecipes.get(turn) ?? []));
    }
  }
  return turns;
}
