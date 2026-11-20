"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConversationMutations, useConversations } from "../hooks/use-conversations";

function ConversationTitleEditor({
  id,
  title: savedTitle,
  onSelect,
}: {
  id: string;
  title: string | null;
  onSelect: (id: string | null) => void;
}): React.JSX.Element {
  const { updateTitle, remove } = useConversationMutations();
  const [title, setTitle] = useState(savedTitle ?? "");

  const rename = (): void => {
    if (!title.trim() || title.trim() === savedTitle) return;
    updateTitle.mutate({ id, title: title.trim() });
  };

  const deleteConversation = (): void => {
    if (!window.confirm("Delete this conversation and its history?")) return;
    remove.mutate(id, { onSuccess: () => onSelect(null) });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <label htmlFor="conversation-title" className="sr-only">Rename conversation</label>
        <input
          id="conversation-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-body-sm"
        />
        <Button type="button" variant="outline" className="h-10" disabled={!title.trim() || updateTitle.isPending} onClick={rename}>Rename</Button>
        <Button type="button" variant="destructive" className="h-10" disabled={remove.isPending} onClick={deleteConversation}>Delete</Button>
      </div>
      {updateTitle.isError && <p role="alert" className="text-label-md text-destructive">Could not rename this conversation: {updateTitle.error.message}</p>}
      {remove.isError && <p role="alert" className="text-label-md text-destructive">Could not delete this conversation: {remove.error.message}</p>}
    </>
  );
}

export function ConversationSwitcher({
  activeId,
  onSelect,
  onCreate,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
}): React.JSX.Element {
  const { data: conversations = [], isPending, isError } = useConversations();
  const active = conversations.find((conversation) => conversation.id === activeId);

  return (
    <section aria-label="Conversations" className="space-y-2 border-b border-border py-3">
      <div className="flex items-center gap-2">
        <label htmlFor="conversation-select" className="sr-only">Conversation</label>
        <select
          id="conversation-select"
          value={activeId ?? ""}
          disabled={isPending}
          onChange={(event) => onSelect(event.target.value || null)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-body-sm"
        >
          <option value="">New conversation</option>
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>{conversation.title || "Untitled conversation"}</option>
          ))}
        </select>
        <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={onCreate}>New chat</Button>
      </div>
      {isError && <p role="alert" className="text-label-md text-destructive">Could not load conversations.</p>}
      {activeId && active && (
        <ConversationTitleEditor key={`${active.id}:${active.title ?? ""}`} id={active.id} title={active.title} onSelect={onSelect} />
      )}
    </section>
  );
}
