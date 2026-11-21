"use client";

import Link from "next/link";
import { useText } from "@/lib/i18n";

export default function NotFound(): React.JSX.Element {
  const { t } = useText();
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
    <h1 className="text-headline-md">{t("common.notFound")}</h1>
    <Link href="/chat" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-primary-foreground">{t("common.backToChat")}</Link>
  </main>;
}
