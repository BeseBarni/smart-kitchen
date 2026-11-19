import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function PwaLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <AppShell>{children}</AppShell>;
}
