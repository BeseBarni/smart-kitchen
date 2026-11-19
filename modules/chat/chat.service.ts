import { err, ok, type AppError, type Result } from "@app/shared";
import { ensureAuthUser } from "../shared/user.repo";
import {
  appendConversationRows,
  createConversationRow,
  deleteConversationRow,
  findConversation,
  listConversationItems,
  listConversationRows,
  recentConversationItems,
  updateConversationTitleRow,
  type AppendConversationItem,
} from "./chat.repo";
import type {
  ConversationDto,
  ConversationItemDto,
  ConversationItemMetadataDto,
  ConversationItemPayloadDto,
} from "./chat.schema";

export type AppendItemInput = {
  type: "message" | "tool_call" | "tool_result" | "skill_execution";
  role: "user" | "assistant" | "system" | "tool";
  callId?: string | null;
  toolName?: string | null;
  payload: ConversationItemPayloadDto;
  metadata?: ConversationItemMetadataDto | null;
};

function toConversationDto(row: NonNullable<Awaited<ReturnType<typeof findConversation>>>): ConversationDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toItemDto(row: NonNullable<Awaited<ReturnType<typeof listConversationItems>>>["items"][number]): ConversationItemDto {
  return {
    ...row,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function toError(): AppError {
  return { code: "ITEM_NOT_FOUND", message: "Conversation not found." };
}

export async function listConversations(
  userId: string,
  options: { limit: number; offset: number },
): Promise<Result<ConversationDto[], AppError>> {
  const rows = await listConversationRows(userId, options.limit, options.offset);
  return ok(rows.map(toConversationDto));
}

export async function createConversation(
  userId: string,
  input: { title?: string } = {},
): Promise<Result<ConversationDto, AppError>> {
  await ensureAuthUser(userId);
  const row = await createConversationRow(userId, input.title);
  return row
    ? ok(toConversationDto(row))
    : err({ code: "INTERNAL_ERROR", message: "Conversation was not created." });
}

export async function getConversationWithItems(
  userId: string,
  conversationId: string,
  options: { limit: number; afterSequence?: number },
): Promise<Result<{ conversation: ConversationDto; items: ConversationItemDto[] }, AppError>> {
  const result = await listConversationItems(
    userId,
    conversationId,
    options.limit,
    options.afterSequence,
  );
  return result
    ? ok({ conversation: toConversationDto(result.conversation), items: result.items.map(toItemDto) })
    : err(toError());
}

export async function updateTitle(
  userId: string,
  conversationId: string,
  title: string,
): Promise<Result<ConversationDto, AppError>> {
  const row = await updateConversationTitleRow(userId, conversationId, title);
  return row ? ok(toConversationDto(row)) : err(toError());
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<Result<{ deleted: true }, AppError>> {
  return (await deleteConversationRow(userId, conversationId))
    ? ok({ deleted: true })
    : err(toError());
}

export async function appendItems(
  userId: string,
  conversationId: string,
  items: AppendItemInput[],
): Promise<Result<ConversationItemDto[], AppError>> {
  const input: AppendConversationItem[] = items.map((item) => ({
    ...item,
    payload: item.payload,
    metadata: item.metadata,
  }));
  const rows = await appendConversationRows(userId, conversationId, input);
  return rows ? ok(rows.map((row) => ({
    ...row,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  }))) : err(toError());
}

export async function getRecentContextItems(
  userId: string,
  conversationId: string,
  options: { maxItems: number },
): Promise<Result<ConversationItemDto[], AppError>> {
  if (!Number.isInteger(options.maxItems) || options.maxItems < 1) {
    return err({ code: "VALIDATION_ERROR", message: "Context item limit must be positive." });
  }
  const rows = await recentConversationItems(userId, conversationId, options.maxItems);
  return rows ? ok(rows.map((row) => ({
    ...row,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  }))) : err(toError());
}
