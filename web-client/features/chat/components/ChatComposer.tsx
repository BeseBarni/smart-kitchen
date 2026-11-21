"use client";

import { ArrowUp, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { useText } from "@/lib/i18n";

interface Props {
  draft: string;
  streaming: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  quickPrompts: ReactNode;
}

export function ChatComposer({ draft, streaming, onDraftChange, onSubmit, onStop, quickPrompts }: Props): React.JSX.Element {
  const { t } = useText();
  return (
    <form
      onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto w-full max-w-[430px] px-margin pb-3"
    >
      {quickPrompts}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <Input value={draft} onChange={(event) => onDraftChange(event.target.value)} aria-label={t("chat.message")} placeholder={t("chat.placeholder")} className="h-11 border-0 bg-transparent px-2 text-body-md" />
        {streaming ? (
          <button type="button" onClick={onStop} aria-label={t("chat.stop")} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Square size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" disabled={!draft.trim()} aria-label={t("chat.send")} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
