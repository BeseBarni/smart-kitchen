import { Suspense } from "react";
import { AccountForm } from "@/features/account";

export default function SignInPage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-margin py-8">
      <div className="mb-6 space-y-1">
        <p className="text-title-sm text-primary">PrepPilot</p>
        <h1 className="text-headline-lg">Welcome to your kitchen</h1>
      </div>
      <Suspense fallback={<p role="status">Loading session...</p>}>
        <AccountForm />
      </Suspense>
    </main>
  );
}
