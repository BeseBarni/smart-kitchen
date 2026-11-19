import type { ChatConversation, ChatMessage, SendMessageInput } from "../types";

const sample: ChatConversation = {
  prompts: [
    { id: "plan", label: "Plan Meal Prep" },
    { id: "rescue", label: "Fridge Rescue" },
    { id: "meal", label: "Log Eaten Meal" },
    { id: "quick", label: "Quick Log" },
  ],
  messages: [
    {
      id: "sample-user",
      role: "user",
      createdAt: "2026-01-01T13:15:00Z",
      text: "I just cooked 6 portions of Gyros Chicken and froze 4 of them, kept 2 in the fridge.",
    },
    {
      id: "sample-assistant",
      role: "assistant",
      createdAt: "2026-01-01T13:16:00Z",
      text: "Logged! 4 portions are marked frozen and 2 are ready in the fridge. That brings your weekly prep total to 14 portions. Would you like me to save this Gyros Chicken recipe to your Catalog for future shopping lists?",
      actions: [
        { storage: "freezer", name: "Gyros Chicken", details: "4 portions · Shelf 2 · Exp: 3 mos" },
        { storage: "fridge", name: "Gyros Chicken", details: "2 portions · Top Shelf · Exp: 4 days" },
      ],
      recipe: {
        title: "Mediterranean Gyros Chicken Bowls",
        description: "High protein · Meal prep friendly · 520 kcal / serving",
        prepMinutes: 35,
        portions: 6,
        ingredients: ["Chicken Breast", "Tzatziki & Cucumber", "Brown Rice", "Lemon & Oregano"],
      },
    },
  ],
};

let conversation: ChatConversation = structuredClone(sample);
let nextMessageId = 0;

export async function getConversation(): Promise<ChatConversation> {
  return structuredClone(conversation);
}

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const text = input.text.trim();
  if (!text) throw new Error("Message cannot be empty.");

  const message: ChatMessage = {
    id: `demo-${++nextMessageId}`,
    role: "user",
    text,
    createdAt: new Date().toISOString(),
  };
  conversation = { ...conversation, messages: [...conversation.messages, message] };
  return structuredClone(message);
}
