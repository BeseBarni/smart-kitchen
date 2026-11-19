"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatConversation } from "../hooks/use-chat";
import { useChatUiStore } from "../stores/chat-ui.store";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { QuickPrompts } from "./QuickPrompts";

export function ChatView(): React.JSX.Element {
  const { data, isPending, isError, refetch } = useChatConversation();
  const draft = useChatUiStore((state) => state.draft);

  return (
    <>
      <h1 className="sr-only">AI Kitchen Assistant Chat</h1>
      {isPending ? (
        <div role="status" aria-label="Loading sample conversation" className="space-y-3 pt-4">
          <Skeleton className="ml-auto h-20 w-3/4" /><Skeleton className="h-36 w-5/6" /><Skeleton className="h-32 w-5/6" />
        </div>
      ) : isError ? (
        <div role="alert" className="space-y-3 py-8 text-body-md">
          <p>Could not load the sample conversation.</p>
          <Button type="button" className="h-11" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          <QuickPrompts prompts={data.prompts} />
          {data.messages.length ? <ChatMessageList messages={data.messages} /> : <p className="py-8 text-body-md text-muted-foreground">No sample messages yet.</p>}
        </>
      )}
      <ChatComposer draft={draft} />
    </>
  );
}
