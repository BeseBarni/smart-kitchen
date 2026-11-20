import type { ChatTurn } from "../types";

export function mergeChatTurns(saved: readonly ChatTurn[], rejected: readonly ChatTurn[]): ChatTurn[] {
  return [...saved, ...rejected].sort((a, b) =>
    (a.userMessage?.createdAt ?? a.assistantMessage.createdAt)
      .localeCompare(b.userMessage?.createdAt ?? b.assistantMessage.createdAt));
}
