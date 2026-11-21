"use client";

import type { ConversationDto } from "@app/modules/schemas";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { CreateConversationInput } from "../api/chat.api";
import { chatApi } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";
import { mapConversationHistory } from "../utils/chat-history.mapper";
import type { MappedConversationHistory } from "../types";
import { rollbackOptimisticMutation, settleDomainQueries, snapshotQueryCaches } from "@/lib/optimistic";
import {
  insertOptimisticConversation,
  removeOptimisticConversation,
  renameOptimisticConversation,
  replaceOptimisticConversation,
} from "../utils/conversation-cache.utils";
import { useChatUiStore } from "../stores/chat-ui.store";

export function useConversations(): UseQueryResult<ConversationDto[], Error> {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => chatApi.listConversations(),
  });
}

export function useConversationHistory(id: string | null): UseQueryResult<MappedConversationHistory, Error> {
  return useQuery({
    queryKey: chatKeys.conversation(id ?? ""),
    queryFn: async () => {
      const history = await chatApi.getConversation(id ?? "");
      return { ...history, turns: mapConversationHistory(history.items) };
    },
    enabled: Boolean(id),
  });
}

interface ConversationMutations {
  create: UseMutationResult<ConversationDto, Error, CreateConversationInput>;
  updateTitle: UseMutationResult<ConversationDto, Error, { id: string; title: string }>;
  remove: UseMutationResult<{ deleted: true }, Error, string>;
}

export function useConversationMutations(): ConversationMutations {
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: chatApi.createConversation,
    mutationKey: ["chat", "create"],
    onMutate: async (input) => {
      const context = await snapshotQueryCaches(client, [chatKeys.all]);
      const conversation = insertOptimisticConversation(client, input);
      return { ...context, optimisticId: conversation.id };
    },
    onSuccess: (conversation, _input, context) =>
      replaceOptimisticConversation(client, context.optimisticId, conversation),
    onError: (_error, _input, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["chat", "create"], [chatKeys.all]);
    },
  });
  const updateTitle = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatApi.updateTitle(id, title),
    mutationKey: ["chat", "rename"],
    onMutate: async ({ id, title }) => {
      const context = await snapshotQueryCaches(client, [chatKeys.all]);
      renameOptimisticConversation(client, id, title);
      return context;
    },
    onSuccess: (conversation, { id }) => replaceOptimisticConversation(client, id, conversation),
    onError: (_error, _variables, context) => rollbackOptimisticMutation(context),
    onSettled: async () => {
      await settleDomainQueries(client, ["chat", "rename"], [chatKeys.all]);
    },
  });
  const remove = useMutation({
    mutationFn: chatApi.removeConversation,
    mutationKey: ["chat", "remove"],
    onMutate: async (id) => {
      const context = await snapshotQueryCaches(client, [chatKeys.all]);
      const activeId = useChatUiStore.getState().activeConversationId;
      if (activeId === id) useChatUiStore.getState().setActiveConversationId(null);
      removeOptimisticConversation(client, id);
      return { ...context, activeId };
    },
    onError: (_error, _id, context) => {
      if (context?.activeId) useChatUiStore.getState().setActiveConversationId(context.activeId);
      rollbackOptimisticMutation(context);
    },
    onSettled: async () => {
      await settleDomainQueries(client, ["chat", "remove"], [chatKeys.all]);
    },
  });
  return { create, updateTitle, remove };
}
