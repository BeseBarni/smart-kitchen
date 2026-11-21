import { create } from "zustand";
import type { ChatAttachment, ChatTurn } from "../types";

interface ChatUiState {
  draft: string;
  selectedPrompt: string | null;
  activeConversationId: string | null;
  rejectedTurns: Record<string, ChatTurn[]>;
  attachments: ChatAttachment[];
  importedReceiptKeys: Record<string, true>;
  addRejectedTurn: (id: string, turn: ChatTurn) => void;
  setDraft: (draft: string) => void;
  setSelectedPrompt: (selectedPrompt: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setAttachments: (attachments: ChatAttachment[]) => void;
  clearAttachments: () => void;
  markReceiptImported: (key: string) => void;
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
  importedReceiptKeys: {},
  markReceiptImported: (key) => set((state) => ({
    importedReceiptKeys: { ...state.importedReceiptKeys, [key]: true },
  })),
}));
