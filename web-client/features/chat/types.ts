// These UI contracts are provisional until shared chat DTOs are defined.
export interface InventoryAction {
  readonly storage: "freezer" | "fridge";
  readonly name: string;
  readonly details: string;
}

export interface RecipeSuggestion {
  readonly title: string;
  readonly description: string;
  readonly prepMinutes: number;
  readonly portions: number;
  readonly ingredients: readonly string[];
}

interface BaseMessage {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
}

export type ChatMessage =
  | (BaseMessage & { readonly role: "user" })
  | (BaseMessage & {
      readonly role: "assistant";
      readonly actions?: readonly InventoryAction[];
      readonly recipe?: RecipeSuggestion;
    });

export interface QuickPrompt {
  readonly id: "plan" | "rescue" | "meal" | "quick";
  readonly label: string;
}

export interface ChatConversation {
  readonly messages: readonly ChatMessage[];
  readonly prompts: readonly QuickPrompt[];
}

export interface SendMessageInput {
  readonly text: string;
}
