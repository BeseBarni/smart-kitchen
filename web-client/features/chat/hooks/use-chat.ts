"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";

export function useChatConversation(): ReturnType<typeof useQuery<Awaited<ReturnType<typeof chatApi.getConversation>>, Error>> {
  return useQuery({ queryKey: chatKeys.conversation(), queryFn: chatApi.getConversation });
}

export function useSendMessage(): ReturnType<typeof useMutation<Awaited<ReturnType<typeof chatApi.sendMessage>>, Error, Parameters<typeof chatApi.sendMessage>[0]>> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: chatKeys.conversation() });
    },
  });
}
