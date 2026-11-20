"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, Plus, Settings, ShoppingCart, SquarePen, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useConversationMutations, useConversations } from "../hooks/use-conversations";
import { ShoppingListSheet } from "@/features/shopping";

function ConversationTitleEditor({
  id,
  title: savedTitle,
  onSelect,
  disabled,
}: {
  id: string;
  title: string | null;
  onSelect: (id: string | null) => void;
  disabled: boolean;
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
          disabled={disabled}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-body-sm"
        />
        <Button type="button" variant="outline" className="h-11" disabled={disabled || !title.trim() || updateTitle.isPending} onClick={rename}>Rename</Button>
        <Button type="button" variant="destructive" className="h-11" disabled={disabled || remove.isPending} onClick={deleteConversation}>Delete</Button>
      </div>
    </>
  );
}

export function ConversationSwitcher({
  activeId,
  onSelect,
  onCreate,
  disabled,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const { data: conversations = [], isPending, isError, refetch } = useConversations();
  const active = conversations.find((conversation) => conversation.id === activeId);

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <header className="fixed inset-x-0 top-0 z-40 mx-auto max-w-[430px] border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-margin">
          <div className="flex items-center gap-2">
            <SheetTrigger render={<button type="button" aria-label="Open side menu" className="flex size-11 items-center justify-center rounded-xl" />}>
              <Menu size={24} aria-hidden="true" />
            </SheetTrigger>
            <span className="text-title-sm">PrepPilot</span>
          </div>
          <div className="flex items-center">
            <button type="button" disabled={disabled} onClick={onCreate} aria-label="Start new conversation" className="flex size-11 items-center justify-center disabled:opacity-50"><SquarePen size={20} aria-hidden="true" /></button>
            <Link href="/account" aria-label="Account" className="flex size-11 items-center justify-center"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserRound size={18} aria-hidden="true" /></span></Link>
          </div>
        </div>
      </header>
      <SheetContent side="left" className="w-[84%] max-w-[340px] gap-0 bg-card pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="border-b border-border p-4">
          <SheetTitle>PrepPilot AI</SheetTitle>
          <Button type="button" variant="secondary" disabled={disabled} className="mt-4 h-11 w-full" onClick={() => { onCreate(); setOpen(false); }}>
            <Plus size={18} aria-hidden="true" /> New Conversation
          </Button>
        </div>
        <section aria-label="Recent conversations" className="flex-1 space-y-2 overflow-y-auto p-3">
          <h2 className="px-2 text-label-sm uppercase tracking-wide text-muted-foreground">Recent conversations</h2>
          {isPending && <p role="status" className="px-2 text-body-sm">Loading conversations...</p>}
          {isError && <Button type="button" variant="outline" className="h-11" onClick={() => void refetch()}>Retry loading conversations</Button>}
          {conversations.map((conversation) => (
            <button key={conversation.id} type="button" disabled={disabled} aria-current={conversation.id === activeId ? "true" : undefined}
              onClick={() => { onSelect(conversation.id); setOpen(false); }}
              className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-body-sm disabled:opacity-50 ${conversation.id === activeId ? "bg-secondary text-primary" : "hover:bg-muted"}`}>
              <MessageCircle size={18} aria-hidden="true" /><span className="truncate">{conversation.title || "Untitled conversation"}</span>
            </button>
          ))}
          {activeId && active && (
            <ConversationTitleEditor key={`${active.id}:${active.title ?? ""}`} id={active.id} title={active.title} onSelect={onSelect} disabled={disabled} />
          )}
        </section>
        <div className="border-t border-border p-3">
          <button type="button" onClick={() => { setOpen(false); setShoppingOpen(true); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-body-sm"><ShoppingCart size={18} aria-hidden="true" />Shopping list</button>
          <Link href="/account" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-body-sm"><Settings size={18} aria-hidden="true" />Settings</Link>
        </div>
      </SheetContent>
    </Sheet>
    <ShoppingListSheet open={shoppingOpen} onClose={() => setShoppingOpen(false)} />
    </>
  );
}
