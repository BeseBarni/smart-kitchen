"use client";

import type { ChatTurn } from "../types";
import { MessageBubble } from "./MessageBubble";
import { UiDirectiveRenderer } from "./UiDirectiveRenderer";
import { useText } from "@/lib/i18n";
import { toolStatusLabel } from "../utils/tool-status";

export function ChatMessageList({
  turns,
  activeStatus,
  onReply,
  streaming,
}: {
  turns: readonly ChatTurn[];
  activeStatus: ChatTurn["activeStatus"];
  onReply: (message: string) => void;
  streaming: boolean;
}): React.JSX.Element {
  const { t, locale } = useText();
  return (
    <ol aria-label={t("chat.messages")} className="space-y-5 pb-36 pt-4">
      {turns.map((turn, index) => {
        const isActive = streaming && index === turns.length - 1;
        const hasRecipe = turn.uiDirectives.some((directive) => directive.component === "recipe_preview_card");
        return <li key={turn.id} className="space-y-3">
          {turn.userMessage && <MessageBubble message={turn.userMessage} />}
          {!isActive && !hasRecipe && turn.assistantMessage.text && <MessageBubble message={turn.assistantMessage} />}
          {isActive && !activeStatus && turn.assistantMessage.text && <p role="status" className="text-label-md text-muted-foreground">{t("chat.preparingResponse")}</p>}
          {turn === turns[turns.length - 1] && activeStatus && (
            <p role="status" className="text-label-md text-muted-foreground">{activeStatus.source === "ai" ? activeStatus.label : activeStatus.status === "running_tool" ? toolStatusLabel(turn.toolSteps.findLast((step) => step.status === "running")?.toolName ?? "", locale) : t(activeStatus.status === "running_skill" ? "chat.preparingSuggestion" : activeStatus.status === "delegating" ? "chat.delegating" : "chat.thinking")}</p>
          )}
          {turn.uiDirectives.map((directive, index) => (
            <UiDirectiveRenderer key={`${turn.id}-directive-${index}`} directive={directive} onReply={onReply} disabled={streaming} recipeResponse={turn.assistantMessage.text} />
          ))}
        </li>;
      })}
    </ol>
  );
}
