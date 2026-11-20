"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSwitcher } from "./ConversationSwitcher";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { QuickPrompts } from "./QuickPrompts";
import { useChatStream } from "../hooks/use-chat-stream";
import { useConversationHistory, useConversationMutations, useConversations } from "../hooks/use-conversations";
import { useChatUiStore } from "../stores/chat-ui.store";
import type { QuickPrompt } from "../types";

const promptText: Record<QuickPrompt["id"], string> = {
  plan: "Help me plan meal prep using my saved recipes and ingredients.",
  rescue: "Check my inventory for expiring foods and suggest a fridge rescue meal.",
  meal: "I want to log a meal I ate.",
  quick: "Help me quickly log an inventory change.",
};

export function ChatView(): React.JSX.Element {
  const { data: conversations = [], isPending: conversationsPending } = useConversations();
  const activeConversationId = useChatUiStore((state) => state.activeConversationId);
  const setActiveConversationId = useChatUiStore((state) => state.setActiveConversationId);
  const draft = useChatUiStore((state) => state.draft);
  const setDraft = useChatUiStore((state) => state.setDraft);
  const initializedSelection = useRef(false);
  const { data: history, isPending, isError, refetch } = useConversationHistory(activeConversationId);
  const { create } = useConversationMutations();
  const onConversationId = useCallback((id: string) => setActiveConversationId(id), [setActiveConversationId]);
  const stream = useChatStream(activeConversationId, onConversationId);

  useEffect(() => {
    if (initializedSelection.current || conversationsPending) return;
    initializedSelection.current = true;
    if (!activeConversationId && conversations[0]) setActiveConversationId(conversations[0].id);
  }, [activeConversationId, conversations, conversationsPending, setActiveConversationId]);

  const turns = useMemo(() => {
    const savedTurns = history?.turns ?? [];
    return stream.turn ? [...savedTurns, stream.turn] : savedTurns;
  }, [history?.turns, stream.turn]);

  const submitMessage = (): void => {
    if (!draft.trim() || stream.isStreaming) return;
    const message = draft;
    setDraft("");
    void stream.sendMessage(message);
  };

  const createConversation = (): void => {
    create.mutate({}, { onSuccess: (conversation) => setActiveConversationId(conversation.id) });
  };

  const selectPrompt = (prompt: QuickPrompt): void => setDraft(promptText[prompt.id]);
  const replyToDirective = (message: string): void => {
    if (stream.isStreaming) return;
    setDraft("");
    void stream.sendMessage(message);
  };

  return (
    <>
      <h1 className="sr-only">AI Kitchen Assistant Chat</h1>
      <ConversationSwitcher
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onCreate={createConversation}
        disabled={stream.isStreaming || create.isPending}
      />
      {create.isError && <p role="alert" className="py-2 text-label-md text-destructive">Could not create a conversation: {create.error.message}</p>}
      {isPending && activeConversationId ? (
        <div role="status" aria-label="Loading conversation" className="space-y-3 pt-4">
          <Skeleton className="ml-auto h-20 w-3/4" /><Skeleton className="h-36 w-5/6" /><Skeleton className="h-32 w-5/6" />
        </div>
      ) : isError ? (
        <div role="alert" className="space-y-3 py-8 text-body-md">
          <p>Could not load this conversation.</p>
          <Button type="button" className="h-11" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          {turns.length ? (
            <ChatMessageList turns={turns} activeStatus={stream.activeStatus} onReply={replyToDirective} streaming={stream.isStreaming} />
          ) : (
            <div className="py-10 text-center text-body-md text-muted-foreground">
              <p>{activeConversationId ? "No messages in this conversation yet." : "Start a conversation with your kitchen assistant."}</p>
            </div>
          )}
        </>
      )}
      {stream.error && <p role="alert" className="fixed bottom-[calc(8rem+env(safe-area-inset-bottom,0px))] z-30 mx-margin max-w-[390px] rounded-lg bg-destructive p-3 text-label-md text-destructive-foreground">{stream.error}</p>}
      <ChatComposer
        draft={draft}
        streaming={stream.isStreaming}
        onDraftChange={setDraft}
        onSubmit={submitMessage}
        onStop={stream.stopStreaming}
        quickPrompts={<QuickPrompts prompts={[
          { id: "plan", label: "Plan Meal Prep" },
          { id: "rescue", label: "Fridge Rescue" },
          { id: "meal", label: "Log Eaten Meal" },
          { id: "quick", label: "Quick Log" },
        ]} onSelect={selectPrompt} />}
      />
    </>
  );
}
