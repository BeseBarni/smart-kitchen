import { ArrowUp, Camera, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ChatComposer({ draft }: { draft: string }): React.JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto w-full max-w-[430px] px-margin pb-3">
      <p id="composer-description" className="mb-1 text-center text-label-sm text-muted-foreground">Demo only · messaging and actions unavailable</p>
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <button type="button" disabled aria-label="Scan unavailable in demo" className="flex size-11 shrink-0 items-center justify-center text-muted-foreground opacity-60"><Camera size={20} /></button>
        <Input disabled value={draft} aria-label="Message" aria-describedby="composer-description" placeholder="Tell me what you cooked or ate..." className="h-11 border-0 bg-transparent px-1 text-body-md disabled:bg-transparent" />
        <button type="button" disabled aria-label="Voice input unavailable in demo" className="flex size-11 shrink-0 items-center justify-center text-muted-foreground opacity-60"><Mic size={20} /></button>
        <button type="button" disabled aria-label="Send unavailable in demo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-50"><ArrowUp size={20} /></button>
      </div>
    </div>
  );
}
