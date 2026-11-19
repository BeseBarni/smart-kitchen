"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchAccount } from "../api/account.api";
import { authClient } from "../api/auth-client";
import { AccountForm } from "./AccountForm";

export function AccountView(): React.JSX.Element {
  const session = authClient.useSession();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const account = useQuery({
    queryKey: ["account", session.data?.user.id],
    queryFn: fetchAccount,
    enabled: Boolean(session.data?.user.id) && !signingOut,
    retry: false,
  });
  const signOut = async (): Promise<void> => {
    setError("");
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message ?? "Could not sign out.");
        return;
      }
      await session.refetch();
      client.removeQueries({ queryKey: ["account"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <div className="space-y-4 py-6">
      <h1 className="text-headline-lg">Account</h1>
      <p className="text-body-sm text-muted-foreground">Your account is separate from the demo inventory and recipes, which are not synced.</p>
      {session.isPending ? <p role="status">Loading session...</p> : session.error ? (
        <div role="alert" className="space-y-3"><p>Could not load your session.</p><Button className="h-11" onClick={() => void session.refetch()}>Try again</Button></div>
      ) : !session.data?.user ? <AccountForm /> : (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          {account.isPending ? <p role="status">Loading account...</p> : account.isError ? (
            <div role="alert" className="space-y-3"><p>{account.error.message}</p><Button className="h-11" onClick={() => void account.refetch()}>Try again</Button></div>
          ) : <div><p className="text-title-sm">{account.data.name}</p><p className="text-body-sm text-muted-foreground">{account.data.email}</p></div>}
          {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
          <Button className="h-11 w-full" variant="outline" disabled={signingOut} onClick={() => void signOut()}>{signingOut ? "Signing out..." : "Sign out"}</Button>
        </div>
      )}
    </div>
  );
}
