import { Suspense } from "react";
import { AccountForm, AuthHeading } from "@/features/account";
import { resolveText } from "@/lib/i18n/orchestrator";

export default function SignInPage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-margin py-8">
      <AuthHeading />
      <Suspense fallback={<p role="status">{resolveText("en", "auth.loadingSession")}</p>}>
        <AccountForm />
      </Suspense>
    </main>
  );
}
