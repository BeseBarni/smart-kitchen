import assert from "node:assert/strict";
import test from "node:test";
import type { ChatTurn } from "../types";
import { mergeChatTurns } from "../utils/merge-chat-turns";
import { useChatUiStore } from "./chat-ui.store";

function turn(id: string, createdAt: string): ChatTurn {
  return {
    id,
    userMessage: { id, role: "user", text: id, createdAt },
    assistantMessage: { id: `${id}-assistant`, role: "assistant", text: "", createdAt },
    toolSteps: [], uiDirectives: [], activeStatus: null,
  };
}

test("keeps rejected turns per conversation and places them among saved turns", () => {
  useChatUiStore.setState({ rejectedTurns: {} });
  const first = turn("rejected", "2026-01-01T10:01:00Z");
  useChatUiStore.getState().addRejectedTurn("one", first);
  useChatUiStore.getState().addRejectedTurn("two", turn("other", "2026-01-01T10:02:00Z"));
  const rejected = useChatUiStore.getState().rejectedTurns;
  assert.deepEqual(rejected.one?.map((item) => item.id), ["rejected"]);
  assert.deepEqual(rejected.two?.map((item) => item.id), ["other"]);
  assert.deepEqual(mergeChatTurns([
    turn("before", "2026-01-01T10:00:00Z"),
    turn("after", "2026-01-01T10:03:00Z"),
  ], rejected.one ?? []).map((item) => item.id), ["before", "rejected", "after"]);
  useChatUiStore.setState({ rejectedTurns: {} });
});
