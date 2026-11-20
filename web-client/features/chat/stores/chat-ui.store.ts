import { create } from "zustand";
import type { ChatTurn } from "../types";

interface ChatUiState {
  draft: string;
  selectedPrompt: string | null;
  activeConversationId: string | null;
  rejectedTurns: Record<string, ChatTurn[]>;
  addRejectedTurn: (id: string, turn: ChatTurn) => void;
  setDraft: (draft: string) => void;
  setSelectedPrompt: (selectedPrompt: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  draft: "",
  selectedPrompt: null,
  activeConversationId: null,
  rejectedTurns: {},
  addRejectedTurn: (id, turn) => set((state) => ({
    rejectedTurns: { ...state.rejectedTurns, [id]: [...(state.rejectedTurns[id] ?? []), turn] },
  })),
  setDraft: (draft) => set({ draft }),
  setSelectedPrompt: (selectedPrompt) => set({ selectedPrompt }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
}));
