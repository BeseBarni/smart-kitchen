import type {
  ConversationDto,
  ListConversationsQuery,
} from "@app/modules/schemas";
import {
  conversationItemSchema,
  conversationSchema,
  createConversationInputSchema,
} from "@app/modules/schemas";
import { z } from "zod";
import { apiClient, unwrapApiResponse } from "@/lib/api-client";
import type { ConversationHistory } from "../types";

export type CreateConversationInput = z.input<typeof createConversationInputSchema>;
const historySchema = z.object({
  conversation: conversationSchema,
  items: z.array(conversationItemSchema),
});

export const chatApi = {
  listConversations: async (
    query: Partial<ListConversationsQuery> = {},
  ): Promise<ConversationDto[]> => {
    const { limit, offset } = query;
    return unwrapApiResponse(
      await apiClient.api.conversations.$get({
        query: {
          ...(limit === undefined ? {} : { limit: String(limit) }),
          ...(offset === undefined ? {} : { offset: String(offset) }),
        },
      }),
      z.array(conversationSchema),
    );
  },
  createConversation: async (input: CreateConversationInput): Promise<ConversationDto> =>
    unwrapApiResponse(
      await apiClient.api.conversations.$post({ json: input }),
      conversationSchema,
    ),
  getConversation: async (
    id: string,
    options: { limit?: number; afterSequence?: number } = {},
  ): Promise<ConversationHistory> => {
    const response = await apiClient.api.conversations[":id"].$get({
      param: { id },
      query: {
        limit: String(options.limit ?? 200),
        ...(options.afterSequence === undefined
          ? {}
          : { afterSequence: String(options.afterSequence) }),
      },
    });
    return unwrapApiResponse(response, historySchema);
  },
  updateTitle: async (id: string, title: string): Promise<ConversationDto> =>
    unwrapApiResponse(
      await apiClient.api.conversations[":id"].$patch({ param: { id }, json: { title } }),
      conversationSchema,
    ),
  removeConversation: async (id: string): Promise<{ deleted: true }> =>
    unwrapApiResponse(
      await apiClient.api.conversations[":id"].$delete({ param: { id } }),
      z.object({ deleted: z.literal(true) }),
    ),
};
