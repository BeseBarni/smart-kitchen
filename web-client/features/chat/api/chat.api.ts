import * as mock from "../mocks/chat.mock";
import type { ChatConversation, ChatMessage, SendMessageInput } from "../types";

export const chatApi = {
  getConversation: (): Promise<ChatConversation> => mock.getConversation(),
  sendMessage: (input: SendMessageInput): Promise<ChatMessage> => mock.sendMessage(input),
};
