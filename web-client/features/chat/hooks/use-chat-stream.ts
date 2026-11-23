"use client";

import type { AgentStreamEvent } from "@app/ai/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAppDomains } from "@/lib/domain-invalidation";
import { ApiClientError } from "@/lib/api-client";
import { chatKeys } from "../api/chat.keys";
import { streamChatTurn } from "../api/chat-stream.client";
import { toolStatusLabel } from "../utils/tool-status";
import type { ChatToolStep, ChatTurn } from "../types";
import { useChatUiStore } from "../stores/chat-ui.store";
import { getText } from "@/lib/i18n";
import { getErrorText } from "@/lib/i18n/error-text";
import type { ChatAttachment } from "../types";

export function useChatStream(
  conversationId: string | null,
  onConversationId: (id: string) => void,
): {
  turn: ChatTurn | null;
  streamingText: string;
  toolSteps: ChatToolStep[];
  activeStatus: ChatTurn["activeStatus"];
  isStreaming: boolean;
  sendMessage: (text: string, attachments?: readonly ChatAttachment[]) => Promise<void>;
  stopStreaming: () => void;
} {
  const queryClient = useQueryClient();
  const [turn, setTurn] = useState<ChatTurn | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const addRejectedTurn = useChatUiStore((state) => state.addRejectedTurn);

  const sendMessage = useCallback(async (value: string, attachments: readonly ChatAttachment[] = []): Promise<void> => {
    const message = value.trim();
    if (!message && attachments.length === 0) return;
    if (controller.current) {
      toast.error(getText("chat.alreadyStreaming"));
      return;
    }
    const abortController = new AbortController();
    controller.current = abortController;
    let activeConversationId = conversationId;
    let recipeChanged = false;
    const newTurn: ChatTurn = {
      id: crypto.randomUUID(),
      userMessage: {
        id: crypto.randomUUID(),
        role: "user",
        text: message,
        attachments: attachments.map((attachment) => ({ ...attachment })),
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
      },
      toolSteps: [],
      uiDirectives: [],
      activeStatus: null,
    };
    setTurn(newTurn);
    setIsStreaming(true);

    try {
      await streamChatTurn({
        conversationId,
        message,
        attachments,
        signal: abortController.signal,
        onConversationId: (id) => {
          activeConversationId = id;
          onConversationId(id);
        },
        onEvent: async (event: AgentStreamEvent) => {
          if (event.type === "turn_started") {
            activeConversationId = event.conversationId;
            setTurn((current) => current ? { ...current, id: event.turnId } : current);
            onConversationId(event.conversationId);
          } else if (event.type === "conversation_title_updated") {
            await queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          } else if (event.type === "agent_status") {
            setTurn((current) => current ? {
              ...current,
              activeStatus: event.source === "ai" ? event : current.activeStatus?.source === "ai"
                ? { ...event, label: current.activeStatus.label, source: "ai" }
                : { ...event, label: event.status === "analyzing_image"
                ? getText("chat.analyzingPhoto")
                : event.status === "running_skill"
                  ? current.activeStatus?.label ?? getText("chat.preparingSuggestion")
                  : event.status === "delegating"
                    ? getText("chat.delegating")
                    : getText("chat.thinking") },
            } : current);
          } else if (event.type === "text_delta") {
            setTurn((current) => current ? {
              ...current,
              activeStatus: null,
              assistantMessage: {
                ...current.assistantMessage,
                text: current.assistantMessage.text + event.delta,
              },
            } : current);
          } else if (event.type === "tool_call_started") {
            setTurn((current) => current ? {
              ...current,
              activeStatus: {
                type: "agent_status",
                agent: event.agent,
                status: "running_tool",
                label: current.activeStatus?.source === "ai" ? current.activeStatus.label : toolStatusLabel(event.toolName),
                ...(current.activeStatus?.source === "ai" ? { source: "ai" as const } : {}),
              },
              toolSteps: [...current.toolSteps, {
                id: event.callId,
                agent: event.agent,
                toolName: event.toolName,
                argsSummary: event.argsSummary,
                status: "running",
                summary: "Running",
              }],
            } : current);
          } else if (event.type === "tool_call_completed") {
            setTurn((current) => current ? {
              ...current,
              toolSteps: current.toolSteps.map((step) => step.id === event.callId ? {
                ...step,
                status: event.success ? "completed" : "failed",
                summary: event.summary,
              } : step),
            } : current);
          } else if (event.type === "skill_completed") {
            setTurn((current) => current ? {
              ...current,
              toolSteps: [...current.toolSteps, {
                id: crypto.randomUUID(),
                agent: null,
                toolName: event.skillName,
                argsSummary: "",
                status: "completed",
                summary: `Completed in ${event.latencyMs} ms`,
              }],
            } : current);
          } else if (event.type === "ui_directive") {
            if (event.invalidateDomains.includes("recipes")) recipeChanged = true;
            setTurn((current) => current ? {
              ...current,
              uiDirectives: [...current.uiDirectives, event.directive],
            } : current);
            await invalidateAppDomains(queryClient, event.invalidateDomains);
            if (event.directive.component === "inventory_action_card") {
              toast.message(getText("chat.inventoryUpdated"));
            } else if (event.directive.component === "consumption_summary_card") {
              toast.message(getText("chat.mealUpdated"));
            }
          } else if (event.type === "error") {
            setTurn((current) => current ? { ...current, activeStatus: null } : current);
            console.error("Chat stream error:", event);
            toast.error(getText("chat.responseError"));
          } else if (event.type === "turn_completed") {
            activeConversationId = event.conversationId;
            onConversationId(event.conversationId);
            if (recipeChanged) await invalidateAppDomains(queryClient, ["recipes"]);
          }
        },
      });
    } catch (cause) {
      if (!abortController.signal.aborted) {
        const reason = cause instanceof ApiClientError ? cause.details?.reason : undefined;
        if (cause instanceof ApiClientError && activeConversationId && newTurn.userMessage &&
          (reason === "off_topic" || reason === "unsafe_kitchen")) {
          addRejectedTurn(activeConversationId, {
            ...newTurn,
            userMessage: { ...newTurn.userMessage, rejected: true },
          });
        }
        toast.error(getErrorText(cause, "chat.responseError"));
        abortController.abort();
      }
    } finally {
      try {
        const invalidations = [queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })];
        if (activeConversationId) {
          invalidations.push(queryClient.invalidateQueries({
            queryKey: chatKeys.conversation(activeConversationId),
          }));
        }
        await Promise.all(invalidations);
      } finally {
        if (controller.current === abortController) controller.current = null;
        setIsStreaming(false);
        setTurn(null);
      }
    }
  }, [addRejectedTurn, conversationId, onConversationId, queryClient]);

  const stopStreaming = useCallback((): void => {
    controller.current?.abort();
  }, []);

  return {
    turn,
    streamingText: turn?.assistantMessage.text ?? "",
    toolSteps: turn?.toolSteps ?? [],
    activeStatus: turn?.activeStatus ?? null,
    isStreaming,
    sendMessage,
    stopStreaming,
  };
}
