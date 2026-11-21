"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  return <ErrorScreen error={error} reset={reset} />;
}
