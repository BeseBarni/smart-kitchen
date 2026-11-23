import type { ReactNode } from "react";

export default function SharedRecipeLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {children}
    </main>
  );
}
