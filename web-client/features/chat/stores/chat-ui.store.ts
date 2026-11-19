import { create } from "zustand";

interface ChatUiState {
  draft: string;
  selectedPrompt: string | null;
  setDraft: (draft: string) => void;
  setSelectedPrompt: (selectedPrompt: string | null) => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  draft: "",
  selectedPrompt: null,
  setDraft: (draft) => set({ draft }),
  setSelectedPrompt: (selectedPrompt) => set({ selectedPrompt }),
}));
