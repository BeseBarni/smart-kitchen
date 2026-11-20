"use client";

import type { ConversationDto } from "@app/modules/schemas";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { CreateConversationInput } from "../api/chat.api";
import { chatApi } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";
import { mapConversationHistory } from "../utils/chat-history.mapper";
import type { MappedConversationHistory } from "../types";

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
  const refreshList = async (): Promise<void> => {
    await client.invalidateQueries({ queryKey: chatKeys.conversations() });
  };
  const create = useMutation({ mutationFn: chatApi.createConversation, onSuccess: refreshList });
  const updateTitle = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatApi.updateTitle(id, title),
    onSuccess: refreshList,
  });
  const remove = useMutation({
    mutationFn: chatApi.removeConversation,
    onSuccess: async (_result, id) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: chatKeys.conversations() }),
        client.removeQueries({ queryKey: chatKeys.conversation(id) }),
      ]);
    },
  });
  return { create, updateTitle, remove };
}
