"use client";

import { Toaster } from "sonner";
import { ErrorScreen } from "@/components/ErrorScreen";
import { LanguageSync } from "@/components/providers/LanguageSync";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  return <html lang="en"><body>
    <LanguageSync />
    <ErrorScreen error={error} reset={reset} />
    <Toaster />
  </body></html>;
}
