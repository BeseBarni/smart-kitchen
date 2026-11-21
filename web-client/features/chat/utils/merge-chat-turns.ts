import type { ChatTurn } from "../types";

export function mergeChatTurns(
  saved: readonly ChatTurn[],
  rejected: readonly ChatTurn[],
  streaming: ChatTurn | null = null,
): ChatTurn[] {
  const turns = [...saved, ...rejected].filter((turn) => turn.id !== streaming?.id).sort((a, b) =>
    (a.userMessage?.createdAt ?? a.assistantMessage.createdAt)
      .localeCompare(b.userMessage?.createdAt ?? b.assistantMessage.createdAt));
  return streaming ? [...turns, streaming] : turns;
}
