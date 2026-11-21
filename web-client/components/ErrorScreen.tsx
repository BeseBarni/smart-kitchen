"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";

export function ErrorScreen({ error, reset }: { error: Error; reset: () => void }): React.JSX.Element {
  const { t } = useText();
  useEffect(() => { console.error("Page rendering failed:", error); }, [error]);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
    <h1 className="text-headline-md">{t("common.error")}</h1>
    <Button type="button" className="min-h-11" onClick={reset}>{t("common.retry")}</Button>
  </main>;
}
