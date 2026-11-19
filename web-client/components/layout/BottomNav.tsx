"use client";

import { BookOpen, MessageCircle, Refrigerator } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav(): React.JSX.Element {
  const pathname = usePathname();
  const itemClass = "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-label-sm";
  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] bg-background/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-around">
        <Link href="/chat" aria-current={pathname === "/chat" ? "page" : undefined} className={`${itemClass} text-primary-pressed focus-visible:outline-2 focus-visible:outline-ring`}>
          <MessageCircle size={22} aria-hidden="true" />Chat
        </Link>
        <button type="button" disabled title="Inventory is not available in this demo" className={`${itemClass} text-muted-foreground opacity-60`}>
          <Refrigerator size={22} aria-hidden="true" />Inventory
        </button>
        <button type="button" disabled title="Recipes are not available in this demo" className={`${itemClass} text-muted-foreground opacity-60`}>
          <BookOpen size={22} aria-hidden="true" />Recipes
        </button>
      </div>
    </nav>
  );
}
