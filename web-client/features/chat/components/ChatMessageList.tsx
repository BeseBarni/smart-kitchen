import { Bot } from "lucide-react";
import type { ChatMessage } from "../types";
import { InventoryActionCard } from "./InventoryActionCard";
import { MessageBubble } from "./MessageBubble";
import { RecipeSuggestionCard } from "./RecipeSuggestionCard";

export function ChatMessageList({ messages }: { messages: readonly ChatMessage[] }): React.JSX.Element {
  return (
    <section aria-label="Sample conversation" className="space-y-3 pt-2">
      <div className="flex justify-center"><span className="rounded-full bg-muted px-2.5 py-1 text-label-sm text-muted-foreground">Sample conversation</span></div>
      {messages.map((message) => message.role === "user" ? (
        <MessageBubble key={message.id} message={message} />
      ) : (
        <div key={message.id} className="flex items-start gap-2">
          <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Bot size={16} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1 space-y-2.5">
            {message.actions && <InventoryActionCard actions={message.actions} />}
            <MessageBubble message={message} />
            {message.recipe && <RecipeSuggestionCard recipe={message.recipe} />}
          </div>
        </div>
      ))}
    </section>
  );
}
