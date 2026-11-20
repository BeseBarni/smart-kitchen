import { z } from "zod";

export type ChatJsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: ChatJsonValue }
  | readonly ChatJsonValue[];

export const chatJsonValueSchema: z.ZodType<ChatJsonValue> = z.lazy(() =>
  z.union([
    z.string().describe("A JSON string."),
    z.number().describe("A JSON number."),
    z.boolean().describe("A JSON boolean."),
    z.null().describe("A JSON null value."),
    z.array(chatJsonValueSchema).describe("A JSON array."),
    z.record(z.string(), chatJsonValueSchema).describe("A JSON object."),
  ]),
);

export const chatJsonObjectSchema = z
  .record(z.string(), chatJsonValueSchema)
  .describe("A JSON object containing tool arguments.");

export const conversationAttachmentSchema = z
  .object({
    name: z.string().describe("Attachment file name."),
    mimeType: z.string().describe("Attachment media type."),
    url: z.string().url().optional().describe("Optional URL for the attachment."),
  })
  .describe("A conversation message attachment.");

export const conversationItemPayloadSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("message").describe("Message payload discriminator."),
        text: z.string().describe("Message text."),
        attachments: z
          .array(conversationAttachmentSchema)
          .optional()
          .describe("Optional message attachments."),
        uiDirectives: z
          .array(chatJsonValueSchema)
          .optional()
          .describe("Optional UI directives emitted during the turn."),
      })
      .describe("A text message with optional attachments."),
    z
      .object({
        kind: z.literal("tool_call").describe("Tool call payload discriminator."),
        arguments: chatJsonObjectSchema.describe("JSON arguments passed to the tool."),
      })
      .describe("A tool invocation and its arguments."),
    z
      .object({
        kind: z.literal("tool_result").describe("Tool result payload discriminator."),
        result: chatJsonValueSchema.optional().describe("JSON result returned by the tool."),
        error: z
          .object({
            code: z.string().describe("Tool error code."),
            message: z.string().describe("Human-readable tool error."),
          })
          .optional()
          .describe("Tool error details, if the invocation failed."),
      })
      .describe("A tool result or error."),
    z
      .object({
        kind: z.literal("skill_execution").describe("Skill execution payload discriminator."),
        input: chatJsonValueSchema.describe("JSON input provided to the skill."),
        output: chatJsonValueSchema.describe("JSON output produced by the skill."),
      })
      .describe("A skill execution input and output."),
  ])
  .describe("Discriminated payload for a conversation ledger item.");

export const conversationItemMetadataSchema = z
  .object({
    model: z.string().optional().describe("Model identifier, if available."),
    inputTokens: z.number().int().nonnegative().optional().describe("Input token count."),
    outputTokens: z.number().int().nonnegative().optional().describe("Output token count."),
    latencyMs: z.number().nonnegative().optional().describe("Execution latency in milliseconds."),
  })
  .describe("Optional execution metadata for a conversation item.");

export const conversationSchema = z
  .object({
    id: z.string().uuid().describe("Conversation identifier."),
    userId: z.string().describe("The external authentication identity ID."),
    title: z.string().nullable().describe("Conversation title, if set."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
    updatedAt: z.iso.datetime().describe("Update time in ISO-8601 format."),
  })
  .describe("A user's conversation.");

export const conversationItemSchema = z
  .object({
    id: z.string().uuid().describe("Conversation ledger item identifier."),
    conversationId: z.string().uuid().describe("Parent conversation identifier."),
    sequence: z.number().int().nonnegative().describe("Position of the item in the conversation."),
    type: z
      .enum(["message", "tool_call", "tool_result", "skill_execution"])
      .describe("Kind of conversation ledger item."),
    role: z.enum(["user", "assistant", "system", "tool"]).describe("Speaker or item role."),
    callId: z.string().nullable().describe("Tool correlation ID, if applicable."),
    toolName: z.string().nullable().describe("Tool name, if applicable."),
    payload: conversationItemPayloadSchema.describe("Structured content for the item."),
    metadata: conversationItemMetadataSchema.nullable().describe("Optional execution metadata."),
    createdAt: z.iso.datetime().describe("Creation time in ISO-8601 format."),
  })
  .superRefine(({ type, payload }, context) => {
    if (type !== payload.kind) {
      context.addIssue({
        code: "custom",
        path: ["payload", "kind"],
        message: "Payload kind must match the conversation item type.",
      });
    }
  })
  .describe("One ordered conversation ledger item.");

export const chatSchema = z
  .object({
    conversation: conversationSchema.describe("Conversation header."),
    items: z.array(conversationItemSchema).describe("Ordered conversation ledger entries."),
  })
  .describe("A complete conversation and its ledger.");

export const listConversationsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(50).describe("Maximum results."),
    offset: z.coerce.number().int().nonnegative().default(0).describe("Results to skip."),
  })
  .describe("Conversation listing filters.");

export const createConversationInputSchema = z
  .object({ title: z.string().trim().min(1).max(120).optional().describe("Optional conversation title.") })
  .describe("Input for creating a conversation.");

export const updateConversationTitleSchema = z
  .object({ title: z.string().trim().min(1).max(120).describe("New conversation title.") })
  .describe("Input for renaming a conversation.");

export const conversationItemsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(200).default(100).describe("Maximum items."),
    afterSequence: z.coerce.number().int().nonnegative().optional().describe("Exclusive sequence cursor."),
  })
  .describe("Conversation history pagination.");

export const conversationIdSchema = z.string().uuid().describe("Conversation identifier.");

export const conversationStreamInputSchema = z
  .object({
    message: z.string().trim().min(1).describe("Message sent by the user."),
    attachments: z.array(conversationAttachmentSchema).optional().describe("Optional message attachments."),
  })
  .describe("Input for streaming a conversation turn.");

export const createChatInputSchema = conversationStreamInputSchema
  .extend({ conversationId: conversationIdSchema.optional().describe("Existing conversation, if any.") })
  .describe("Input for the convenience chat endpoint.");

export type ConversationItemPayloadDto = z.infer<typeof conversationItemPayloadSchema>;
export type ConversationItemMetadataDto = z.infer<typeof conversationItemMetadataSchema>;
export type ConversationDto = z.infer<typeof conversationSchema>;
export type ConversationItemDto = z.infer<typeof conversationItemSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type CreateConversationInput = z.input<typeof createConversationInputSchema>;
export type ConversationStreamInput = z.infer<typeof conversationStreamInputSchema>;
export type CreateChatInput = z.infer<typeof createChatInputSchema>;
