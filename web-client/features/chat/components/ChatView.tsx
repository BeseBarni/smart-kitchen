"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
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
import { mergeChatTurns } from "../utils/merge-chat-turns";
import { getText, useText, type TranslationKey } from "@/lib/i18n";
import { compressImageFiles, revokeAttachmentPreviews } from "../utils/image-capture.utils";
import type { ChatAttachment } from "../types";

const promptText: Record<QuickPrompt["id"], TranslationKey> = {
  plan: "chat.promptPlanText",
  rescue: "chat.promptRescueText",
  meal: "chat.promptMealText",
  quick: "chat.promptQuickText",
};

export function ChatView(): React.JSX.Element {
  const { t } = useText();
  const { data: conversations = [], isPending: conversationsPending, error: conversationsError } = useConversations();
  const activeConversationId = useChatUiStore((state) => state.activeConversationId);
  const setActiveConversationId = useChatUiStore((state) => state.setActiveConversationId);
  const draft = useChatUiStore((state) => state.draft);
  const setDraft = useChatUiStore((state) => state.setDraft);
  const attachments = useChatUiStore((state) => state.attachments);
  const setAttachments = useChatUiStore((state) => state.setAttachments);
  const rejectedTurns = useChatUiStore((state) => state.rejectedTurns);
  const initializedSelection = useRef(false);
  const { data: history, isPending, isError, error: historyError, refetch } = useConversationHistory(activeConversationId);
  const { create } = useConversationMutations();
  const onConversationId = useCallback((id: string) => setActiveConversationId(id), [setActiveConversationId]);
  const stream = useChatStream(activeConversationId, onConversationId);
  const pendingAutoPrompt = useChatUiStore((state) => state.pendingAutoPrompt);
  const consumePendingAutoPrompt = useChatUiStore((state) => state.consumePendingAutoPrompt);
  const processedPromptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversationsError) toast.error(getText("chat.conversationsError"), { id: "conversations-error" });
  }, [conversationsError]);
  useEffect(() => {
    if (historyError) toast.error(getText("chat.historyError"), { id: "conversation-history-error" });
  }, [historyError]);

  useEffect(() => {
    if (initializedSelection.current || conversationsPending || pendingAutoPrompt) return;
    initializedSelection.current = true;
    if (!activeConversationId && conversations[0]) setActiveConversationId(conversations[0].id);
  }, [activeConversationId, conversations, conversationsPending, pendingAutoPrompt, setActiveConversationId]);

  useEffect(() => {
    if (!pendingAutoPrompt || stream.isStreaming) return;
    if (processedPromptIdRef.current === pendingAutoPrompt.id) return;
    processedPromptIdRef.current = pendingAutoPrompt.id;
    const prompt = consumePendingAutoPrompt();
    if (prompt) void stream.sendMessage(prompt.text);
  }, [consumePendingAutoPrompt, pendingAutoPrompt, stream]);

  const turns = useMemo(() => {
    return mergeChatTurns(history?.turns ?? [], activeConversationId ? rejectedTurns[activeConversationId] ?? [] : [], stream.turn);
  }, [activeConversationId, history?.turns, rejectedTurns, stream.turn]);

  const submitMessage = (): void => {
    if ((!draft.trim() && attachments.length === 0) || stream.isStreaming) return;
    const message = draft;
    const sendingAttachments = [...attachments];
    setDraft("");
    setAttachments([]);
    void stream.sendMessage(message, sendingAttachments);
  };

  const onFiles = (files: readonly File[]): void => {
    void compressImageFiles(files)
      .then((prepared) => setAttachments([...attachments, ...prepared].slice(0, 3)))
      .catch((error: unknown) => {
        let key: TranslationKey = "chat.compressionFailed";
        if (error instanceof Error) {
          if (error.message === "chat.tooManyAttachments") key = "chat.tooManyAttachments";
          if (error.message === "chat.unsupportedAttachment") key = "chat.unsupportedAttachment";
          if (error.message === "chat.imageUnsupported") key = "chat.imageUnsupported";
          if (error.message === "chat.attachmentTooLarge") key = "chat.attachmentTooLarge";
        }
        toast.error(getText(key));
      });
  };
  const onAttachmentsChange = (next: ChatAttachment[]): void => {
    const removed = attachments.filter((item) => !next.some((entry) => entry.id === item.id));
    revokeAttachmentPreviews(removed);
    setAttachments(next);
  };

  const createConversation = (): void => {
    create.mutate({}, { onSuccess: (conversation) => setActiveConversationId(conversation.id) });
  };

  const selectPrompt = (prompt: QuickPrompt): void => setDraft(t(promptText[prompt.id]));
  const replyToDirective = (message: string): void => {
    if (stream.isStreaming) return;
    setDraft("");
    void stream.sendMessage(message);
  };

  return (
    <>
      <h1 className="sr-only">{t("chat.title")}</h1>
      <ConversationSwitcher
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onCreate={createConversation}
        disabled={stream.isStreaming || create.isPending}
      />
      {isPending && activeConversationId ? (
        <div role="status" aria-label={t("chat.loading")} className="space-y-3 pt-4">
          <Skeleton className="ml-auto h-20 w-3/4" /><Skeleton className="h-36 w-5/6" /><Skeleton className="h-32 w-5/6" />
        </div>
      ) : isError ? (
        <div className="space-y-3 py-8 text-body-md">
          <Button type="button" className="h-11" onClick={() => void refetch()}>{t("common.retry")}</Button>
        </div>
      ) : (
        <>
          {turns.length ? (
            <ChatMessageList turns={turns} activeStatus={stream.activeStatus} onReply={replyToDirective} streaming={stream.isStreaming} />
          ) : (
            <div className="py-10 text-center text-body-md text-muted-foreground">
              <p>{t(activeConversationId ? "chat.emptyHistory" : "chat.emptyChat")}</p>
            </div>
          )}
        </>
      )}
      <ChatComposer
        draft={draft}
        streaming={stream.isStreaming}
        onDraftChange={setDraft}
        onSubmit={submitMessage}
        onStop={stream.stopStreaming}
        quickPrompts={<QuickPrompts prompts={[
          { id: "plan", label: t("chat.promptPlan") },
          { id: "rescue", label: t("chat.promptRescue") },
          { id: "meal", label: t("chat.promptMeal") },
          { id: "quick", label: t("chat.promptQuick") },
        ]} onSelect={selectPrompt} />}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
        onFiles={onFiles}
      />
    </>
  );
}
