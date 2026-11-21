import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./users";
import { conversationItemTypeEnum, conversationRoleEnum } from "./enums";

export type ConversationJsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: ConversationJsonValue }
  | readonly ConversationJsonValue[];

export type ConversationJsonObject = Readonly<Record<string, ConversationJsonValue>>;

export type ConversationItemPayload =
  | {
      kind: "message";
      text: string;
      attachments?: {
        name: string;
        mimeType: string;
        url?: string;
        width?: number;
        height?: number;
        sizeBytes?: number;
      }[];
      uiDirectives?: ConversationJsonValue[];
    }
  | { kind: "tool_call"; arguments: ConversationJsonObject }
  | {
      kind: "tool_result";
      result?: ConversationJsonValue;
      error?: { code: string; message: string };
    }
  | {
      kind: "skill_execution";
      input: ConversationJsonValue;
      output: ConversationJsonValue;
    };

export interface ConversationItemMetadata {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("conversations_user_updated_at_idx").on(table.userId, table.updatedAt)],
);

export const conversationItems = pgTable(
  "conversation_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: conversationItemTypeEnum("type").notNull(),
    role: conversationRoleEnum("role").notNull(),
    callId: text("call_id"),
    toolName: text("tool_name"),
    payload: jsonb("payload").$type<ConversationItemPayload>().notNull(),
    metadata: jsonb("metadata").$type<ConversationItemMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("conversation_items_conversation_sequence_uq").on(
      table.conversationId,
      table.sequence,
    ),
    index("conversation_items_conversation_call_id_idx").on(table.conversationId, table.callId),
  ],
);
