"use client";

import { BookOpen, Flame, MessageCircle, Refrigerator, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useText } from "@/lib/i18n";

export function BottomNav(): React.JSX.Element {
  const pathname = usePathname();
  const { t } = useText();
  const itemClass = "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 text-[10px] leading-none";
  return (
    <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] bg-background/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-around">
        <Link href="/chat" aria-current={pathname === "/chat" ? "page" : undefined} className={`${itemClass} ${pathname === "/chat" ? "text-primary-pressed" : "text-muted-foreground"} focus-visible:outline-2 focus-visible:outline-ring`}>
          <MessageCircle size={22} aria-hidden="true" /><span className="truncate">{t("nav.chat")}</span>
        </Link>
        <Link href="/inventory" aria-current={pathname === "/inventory" ? "page" : undefined} className={`${itemClass} ${pathname === "/inventory" ? "text-primary-pressed" : "text-muted-foreground"} focus-visible:outline-2 focus-visible:outline-ring`}>
          <Refrigerator size={22} aria-hidden="true" /><span className="truncate">{t("nav.inventory")}</span>
        </Link>
        <Link href="/recipes" aria-current={pathname === "/recipes" || pathname.startsWith("/recipes/") ? "page" : undefined} className={`${itemClass} ${pathname === "/recipes" || pathname.startsWith("/recipes/") ? "text-primary-pressed" : "text-muted-foreground"} focus-visible:outline-2 focus-visible:outline-ring`}>
          <BookOpen size={22} aria-hidden="true" /><span className="truncate">{t("nav.recipes")}</span>
        </Link>
        <Link href="/tracker" aria-current={pathname === "/tracker" ? "page" : undefined} className={`${itemClass} ${pathname === "/tracker" ? "text-primary-pressed" : "text-muted-foreground"} focus-visible:outline-2 focus-visible:outline-ring`}>
          <Flame size={22} aria-hidden="true" /><span className="truncate">{t("nav.tracker")}</span>
        </Link>
        <Link href="/budget" aria-current={pathname === "/budget" ? "page" : undefined} className={`${itemClass} ${pathname === "/budget" ? "text-primary-pressed" : "text-muted-foreground"} focus-visible:outline-2 focus-visible:outline-ring`}>
          <WalletCards size={22} aria-hidden="true" /><span className="max-w-full truncate">{t("nav.budget")}</span>
        </Link>
      </div>
    </nav>
  );
}
