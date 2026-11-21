"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { LanguageSync } from "./LanguageSync";

export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: { retry: 0 },
    },
  }));
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => console.error("Service worker registration failed:", error));
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageSync />
      {children}
      <Toaster position="top-right" mobileOffset={{ top: "max(1rem, env(safe-area-inset-top))", right: "1rem", left: "1rem" }} />
    </QueryClientProvider>
  );
}
