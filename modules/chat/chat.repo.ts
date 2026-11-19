import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import {
  conversationItems,
  conversations,
  getDatabase,
  type ConversationItemPayload,
  type ConversationItemMetadata,
} from "@app/db";

export type AppendConversationItem = {
  type: "message" | "tool_call" | "tool_result" | "skill_execution";
  role: "user" | "assistant" | "system" | "tool";
  callId?: string | null;
  toolName?: string | null;
  payload: ConversationItemPayload;
  metadata?: ConversationItemMetadata | null;
};

export async function listConversationRows(userId: string, limit: number, offset: number) {
  return getDatabase()
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function createConversationRow(userId: string, title?: string) {
  const [row] = await getDatabase().insert(conversations).values({ userId, title }).returning();
  return row;
}

export async function findConversation(userId: string, conversationId: string) {
  const [row] = await getDatabase()
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
    .limit(1);
  return row;
}

export async function listConversationItems(
  userId: string,
  conversationId: string,
  limit: number,
  afterSequence?: number,
) {
  const conversation = await findConversation(userId, conversationId);
  if (!conversation) return undefined;
  const where = afterSequence === undefined
    ? eq(conversationItems.conversationId, conversationId)
    : and(
        eq(conversationItems.conversationId, conversationId),
        gt(conversationItems.sequence, afterSequence),
      );
  const items = await getDatabase()
    .select()
    .from(conversationItems)
    .where(where)
    .orderBy(asc(conversationItems.sequence))
    .limit(limit);
  return { conversation, items };
}

export async function recentConversationItems(userId: string, conversationId: string, maxItems: number) {
  const conversation = await findConversation(userId, conversationId);
  if (!conversation) return undefined;
  const items = await getDatabase()
    .select()
    .from(conversationItems)
    .where(eq(conversationItems.conversationId, conversationId))
    .orderBy(desc(conversationItems.sequence))
    .limit(maxItems);
  return items.reverse();
}

export async function updateConversationTitleRow(
  userId: string,
  conversationId: string,
  title: string,
) {
  const [row] = await getDatabase()
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
    .returning();
  return row;
}

export async function deleteConversationRow(userId: string, conversationId: string): Promise<boolean> {
  const rows = await getDatabase()
    .delete(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
    .returning({ id: conversations.id });
  return rows.length > 0;
}

export async function appendConversationRows(
  userId: string,
  conversationId: string,
  items: AppendConversationItem[],
) {
  return getDatabase().transaction(async (tx) => {
    const [conversation] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
      .for("update")
      .limit(1);
    if (!conversation) return undefined;
    const [sequenceRow] = await tx
      .select({ maxSequence: sql<number>`coalesce(max(${conversationItems.sequence}), 0)` })
      .from(conversationItems)
      .where(eq(conversationItems.conversationId, conversationId));
    const nextSequence = Number(sequenceRow?.maxSequence ?? 0) + 1;
    const rows = items.length === 0
      ? []
      : await tx.insert(conversationItems).values(
          items.map((item, index) => ({
            ...item,
            conversationId,
            sequence: nextSequence + index,
            callId: item.callId ?? null,
            toolName: item.toolName ?? null,
            metadata: item.metadata ?? null,
          })),
        ).returning();
    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)));
    return rows;
  });
}
