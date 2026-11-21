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
import { revokeAttachmentPreviews } from "../utils/image-capture.utils";
import type { ChatAttachment } from "../types";
import { uploadImageToR2 } from "@/lib/media/media-upload.client";

const promptText: Record<QuickPrompt["id"], TranslationKey> = {
  plan: "chat.promptPlanText",
  rescue: "chat.promptRescueText",
  meal: "chat.promptMealText",
  quick: "chat.promptQuickText",
};

export function ChatView(): React.JSX.Element {
  const { t } = useText();
  const { error: conversationsError } = useConversations();
  const activeConversationId = useChatUiStore((state) => state.activeConversationId);
  const setActiveConversationId = useChatUiStore((state) => state.setActiveConversationId);
  const draft = useChatUiStore((state) => state.draft);
  const setDraft = useChatUiStore((state) => state.setDraft);
  const attachments = useChatUiStore((state) => state.attachments);
  const setAttachments = useChatUiStore((state) => state.setAttachments);
  const rejectedTurns = useChatUiStore((state) => state.rejectedTurns);
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
    if (attachments.some((attachment) => !attachment.assetId)) {
      toast.message(getText("chat.uploading"));
      return;
    }
    const message = draft;
    const sendingAttachments = [...attachments];
    setDraft("");
    setAttachments([]);
    void stream.sendMessage(message, sendingAttachments);
  };

  const onFiles = (files: readonly File[]): void => {
    if (attachments.length + files.length > 3) {
      toast.error(getText("chat.tooManyAttachments"));
      return;
    }
    for (const file of files) {
      const id = crypto.randomUUID();
      const optimistic: ChatAttachment = {
        id,
        name: file.name || `photo-${attachments.length + 1}`,
        mimeType: "image/jpeg",
        previewUrl: URL.createObjectURL(file),
      };
      setAttachments([...(useChatUiStore.getState().attachments), optimistic].slice(0, 3));
      void uploadImageToR2(file, { purpose: "chat_attachment" })
        .then((uploaded) => {
          setAttachments(useChatUiStore.getState().attachments.map((attachment) =>
            attachment.id === id
              ? {
                  ...attachment,
                  id: uploaded.assetId,
                  assetId: uploaded.assetId,
                  mimeType: uploaded.mimeType,
                  previewUrl: uploaded.previewUrl,
                  width: uploaded.width,
                  height: uploaded.height,
                  sizeBytes: uploaded.sizeBytes,
                }
              : attachment,
          ));
        })
        .catch((error: unknown) => {
          setAttachments(useChatUiStore.getState().attachments.filter((attachment) => attachment.id !== id));
          const key: TranslationKey = error instanceof Error && error.message === "chat.attachmentTooLarge"
            ? "chat.attachmentTooLarge"
            : "chat.uploadFailed";
          toast.error(getText(key));
        });
    }
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
