import type { ConversationDto } from "@app/modules/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { createOptimisticId } from "@/lib/optimistic";
import { chatKeys } from "../api/chat.keys";
import type { CreateConversationInput } from "../api/chat.api";

export function insertOptimisticConversation(
  client: QueryClient,
  input: CreateConversationInput,
): ConversationDto {
  const now = new Date().toISOString();
  const conversation: ConversationDto = {
    id: createOptimisticId(),
    userId: "",
    title: input.title ?? null,
    createdAt: now,
    updatedAt: now,
  };
  client.setQueryData<ConversationDto[]>(chatKeys.conversations(), (conversations) =>
    conversations ? [conversation, ...conversations] : [conversation],
  );
  return conversation;
}

export function replaceOptimisticConversation(
  client: QueryClient,
  optimisticId: string,
  conversation: ConversationDto,
): void {
  client.setQueryData<ConversationDto[]>(chatKeys.conversations(), (conversations) =>
    conversations?.map((entry) => entry.id === optimisticId ? conversation : entry),
  );
  for (const id of [optimisticId, conversation.id]) {
    client.setQueryData(chatKeys.conversation(id), (history: unknown) => {
      if (!history || typeof history !== "object") return history;
      if ("conversation" in history) {
        return { ...history, conversation };
      }
      return history;
    });
  }
}

export function renameOptimisticConversation(
  client: QueryClient,
  id: string,
  title: string,
): void {
  client.setQueryData<ConversationDto[]>(chatKeys.conversations(), (conversations) =>
    conversations?.map((conversation) =>
      conversation.id === id ? { ...conversation, title } : conversation,
    ),
  );
  client.setQueryData(chatKeys.conversation(id), (history: unknown) => {
    if (!history || typeof history !== "object") return history;
    if ("conversation" in history) {
      const conversation = history.conversation;
      if (conversation && typeof conversation === "object") {
        return { ...history, conversation: { ...conversation, title } };
      }
    }
    return history;
  });
}

export function removeOptimisticConversation(client: QueryClient, id: string): void {
  client.setQueryData<ConversationDto[]>(chatKeys.conversations(), (conversations) =>
    conversations?.filter((conversation) => conversation.id !== id),
  );
  client.removeQueries({ queryKey: chatKeys.conversation(id) });
}
