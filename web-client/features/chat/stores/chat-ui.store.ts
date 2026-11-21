import { create } from "zustand";
import type { ChatAttachment, ChatTurn } from "../types";

interface ChatUiState {
  draft: string;
  selectedPrompt: string | null;
  activeConversationId: string | null;
  rejectedTurns: Record<string, ChatTurn[]>;
  attachments: ChatAttachment[];
  addRejectedTurn: (id: string, turn: ChatTurn) => void;
  setDraft: (draft: string) => void;
  setSelectedPrompt: (selectedPrompt: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setAttachments: (attachments: ChatAttachment[]) => void;
  clearAttachments: () => void;
  pendingAutoPrompt: { id: string; text: string } | null;
  queueNewChatPrompt: (text: string) => void;
  consumePendingAutoPrompt: () => { id: string; text: string } | null;
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
  attachments: [],
  setAttachments: (attachments) => set({ attachments }),
  clearAttachments: () => set({ attachments: [] }),
  pendingAutoPrompt: null,
  queueNewChatPrompt: (text) => set({
    activeConversationId: null,
    pendingAutoPrompt: { id: crypto.randomUUID(), text },
  }),
  consumePendingAutoPrompt: () => {
    let consumed: { id: string; text: string } | null = null;
    set((state) => {
      consumed = state.pendingAutoPrompt;
      return { pendingAutoPrompt: null };
    });
    return consumed;
  },
}));
