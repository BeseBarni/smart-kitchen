import assert from "node:assert/strict";
import test from "node:test";
import type { ChatTurn } from "../types";
import { mergeChatTurns } from "./merge-chat-turns";

function turn(id: string, text: string, createdAt: string): ChatTurn {
  return {
    id,
    userMessage: { id: `${id}-user`, role: "user", text, createdAt },
    assistantMessage: { id: `${id}-assistant`, role: "assistant", text: "", createdAt },
    toolSteps: [],
    uiDirectives: [],
    activeStatus: null,
  };
}

test("replaces a persisted in-progress turn with its streaming version", () => {
  const earlier = turn("earlier", "Soup", "2026-01-01T10:00:00Z");
  const saved = turn("persisted", "Soup", "2026-01-01T10:01:00Z");
  const streaming = { ...saved, assistantMessage: { ...saved.assistantMessage, text: "Working" } };
  assert.deepEqual(mergeChatTurns([earlier, saved], [], streaming), [earlier, streaming]);
});

test("retains history and rejected turns when the streaming turn is not persisted", () => {
  const saved = turn("saved", "Soup", "2026-01-01T10:00:00Z");
  const rejected = turn("rejected", "Soup", "2026-01-01T10:01:00Z");
  const streaming = turn("new", "Soup", "2026-01-01T10:02:00Z");
  assert.deepEqual(mergeChatTurns([saved], [rejected], streaming), [saved, rejected, streaming]);
  assert.deepEqual(mergeChatTurns([saved], [rejected]), [saved, rejected]);
});
