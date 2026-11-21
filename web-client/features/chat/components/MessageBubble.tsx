import { MarkdownContent } from "@/components/MarkdownContent";
import type { ChatMessage } from "../types";
import { formatChatTime } from "../utils/chat-formatters";
import { TriangleAlert } from "lucide-react";
import { useText } from "@/lib/i18n";

export function MessageBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const { t, locale } = useText();
  const user = message.role === "user";
  return (
    <div className={`flex flex-col ${user ? "items-end pl-8" : "items-start"}`}>
      <div className={`max-w-full rounded-2xl px-3 py-2 text-body-md leading-relaxed shadow-[0_1px_3px_rgba(17,24,39,0.04)] ${message.rejected ? "rounded-tr-sm bg-destructive/10 text-destructive" : user ? "rounded-tr-sm bg-foreground text-background" : "rounded-tl-sm border border-border bg-card"}`}>
        <span className="sr-only">{t(user ? "chat.you" : "chat.assistant")} </span>
        {user ? <span className="flex items-start gap-2"><span>{message.text}</span>{message.rejected && <TriangleAlert className="mt-0.5 shrink-0" size={20} aria-label={t("chat.rejected")} />}</span> : <MarkdownContent text={message.text} />}
      </div>
      <time dateTime={message.createdAt} className="mx-1 mt-1 text-label-sm text-muted-foreground">{formatChatTime(message.createdAt, locale)} UTC</time>
    </div>
  );
}
