export { ChatView } from "./components/ChatView";
export { chatKeys } from "./api/chat.keys";
export { useChatStream } from "./hooks/use-chat-stream";
export { useConversationHistory, useConversationMutations, useConversations } from "./hooks/use-conversations";
export type { ChatMessage, ChatToolStep, ChatTurn, ConversationHistory, MappedConversationHistory, QuickPrompt } from "./types";
export { useChatUiStore } from "./stores/chat-ui.store";
import { useChatUiStore } from "./stores/chat-ui.store";
export function queueNewChatPrompt(text: string): void {
  useChatUiStore.getState().queueNewChatPrompt(text);
}
