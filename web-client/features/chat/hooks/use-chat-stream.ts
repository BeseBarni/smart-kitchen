"use client";

import type { AgentStreamEvent } from "@app/ai/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAppDomains } from "@/lib/domain-invalidation";
import { chatKeys } from "../api/chat.keys";
import { streamChatTurn } from "../api/chat-stream.client";
import { toolStatusLabel } from "../utils/tool-status";
import type { ChatToolStep, ChatTurn } from "../types";

export function useChatStream(
  conversationId: string | null,
  onConversationId: (id: string) => void,
): {
  turn: ChatTurn | null;
  streamingText: string;
  toolSteps: ChatToolStep[];
  activeStatus: ChatTurn["activeStatus"];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
} {
  const queryClient = useQueryClient();
  const [turn, setTurn] = useState<ChatTurn | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (value: string): Promise<void> => {
    const message = value.trim();
    if (!message) return;
    if (controller.current) {
      setError("A response is already streaming.");
      return;
    }
    const abortController = new AbortController();
    controller.current = abortController;
    let activeConversationId = conversationId;
    setError(null);
    setTurn({
      id: crypto.randomUUID(),
      userMessage: {
        id: crypto.randomUUID(),
        role: "user",
        text: message,
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
    });
    setIsStreaming(true);

    try {
      await streamChatTurn({
        conversationId,
        message,
        signal: abortController.signal,
        onConversationId: (id) => {
          activeConversationId = id;
          onConversationId(id);
        },
        onEvent: async (event: AgentStreamEvent) => {
          if (event.type === "turn_started") {
            activeConversationId = event.conversationId;
            onConversationId(event.conversationId);
          } else if (event.type === "agent_status") {
            setTurn((current) => current ? {
              ...current,
              activeStatus: { ...event, label: event.status === "running_skill"
                ? current.activeStatus?.label ?? "Preparing your suggestion..."
                : event.status === "delegating"
                  ? "Getting the right help..."
                  : "Thinking..." },
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
                label: toolStatusLabel(event.toolName),
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
            setTurn((current) => current ? {
              ...current,
              uiDirectives: [...current.uiDirectives, event.directive],
            } : current);
            await invalidateAppDomains(queryClient, event.invalidateDomains);
            if (event.directive.component === "inventory_action_card") {
              toast.message("Inventory updated from chat.");
            } else if (event.directive.component === "consumption_summary_card") {
              toast.message("Meal log updated from chat.");
            }
          } else if (event.type === "error") {
            setTurn((current) => current ? { ...current, activeStatus: null } : current);
            setError(event.message);
          } else if (event.type === "turn_completed") {
            activeConversationId = event.conversationId;
            onConversationId(event.conversationId);
          }
        },
      });
    } catch (cause) {
      if (!abortController.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "The response could not be completed.");
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
  }, [conversationId, onConversationId, queryClient]);

  const stopStreaming = useCallback((): void => {
    controller.current?.abort();
  }, []);

  return {
    turn,
    streamingText: turn?.assistantMessage.text ?? "",
    toolSteps: turn?.toolSteps ?? [],
    activeStatus: turn?.activeStatus ?? null,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
  };
}
