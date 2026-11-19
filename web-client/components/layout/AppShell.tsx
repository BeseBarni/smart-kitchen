import { SlidersHorizontal, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background">
      <header className="fixed inset-x-0 top-0 z-50 mx-auto max-w-[430px] bg-background/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-margin">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-title-sm">PrepPilot</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="truncate text-body-sm text-muted-foreground">Assistant Chat</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-label-sm text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Demo · 14 portions stocked
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button type="button" disabled aria-label="Filters unavailable in demo" className="flex size-11 items-center justify-center text-muted-foreground opacity-60"><SlidersHorizontal size={20} /></button>
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Demo profile"><UserRound size={18} /></span>
          </div>
        </div>
      </header>
      <main className="min-h-dvh px-margin pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-[calc(10rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
