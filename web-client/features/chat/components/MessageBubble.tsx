import { MarkdownContent } from "@/components/MarkdownContent";
import type { ChatMessage } from "../types";
import { formatChatTime } from "../utils/chat-formatters";

export function MessageBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const user = message.role === "user";
  return (
    <div className={`flex flex-col ${user ? "items-end pl-8" : "items-start"}`}>
      <div className={`max-w-full rounded-2xl px-3 py-2 text-body-md leading-relaxed shadow-[0_1px_3px_rgba(17,24,39,0.04)] ${user ? "rounded-tr-sm bg-foreground text-background" : "rounded-tl-sm border border-border bg-card"}`}>
        <span className="sr-only">{user ? "You: " : "Assistant: "}</span>
        {user ? message.text : <MarkdownContent text={message.text} />}
      </div>
      <time dateTime={message.createdAt} className="mx-1 mt-1 text-label-sm text-muted-foreground">{formatChatTime(message.createdAt)} UTC</time>
    </div>
  );
}
