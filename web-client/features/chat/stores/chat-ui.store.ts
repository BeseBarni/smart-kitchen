import { create } from "zustand";

interface ChatUiState {
  draft: string;
  selectedPrompt: string | null;
  activeConversationId: string | null;
  setDraft: (draft: string) => void;
  setSelectedPrompt: (selectedPrompt: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  draft: "",
  selectedPrompt: null,
  activeConversationId: null,
  setDraft: (draft) => set({ draft }),
  setSelectedPrompt: (selectedPrompt) => set({ selectedPrompt }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
}));
