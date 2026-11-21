"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n";
import { SettingsView } from "@/features/settings";
import { fetchAccount } from "../api/account.api";
import { authClient } from "../api/auth-client";

export function AccountView(): React.JSX.Element {
  const { t } = useText();
  const session = authClient.useSession();
  const client = useQueryClient();
  const [error, setError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const account = useQuery({
    queryKey: ["account", session.data?.user.id],
    queryFn: fetchAccount,
    enabled: Boolean(session.data?.user.id) && !signingOut,
    retry: false,
  });
  const signOut = async (): Promise<void> => {
    setError(false);
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(true);
        return;
      }
      client.clear();
      window.location.replace("/auth/sign-in");
    } catch (cause) {
      console.error("Sign out failed:", cause);
      setError(true);
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <div className="space-y-4 py-6">
      <h1 className="text-headline-lg">{t("nav.account")}</h1>
      <SettingsView />
      {session.isPending ? <p role="status">{t("auth.loadingSession")}</p> : session.error ? (
        <div role="alert" className="space-y-3"><p>{t("auth.sessionError")}</p><Button className="h-11" onClick={() => void session.refetch()}>{t("common.retry")}</Button></div>
      ) : !session.data?.user ? (
        <div role="alert" className="space-y-3">
          <p>{t("auth.sessionEnded")}</p>
          <Button className="h-11" onClick={() => window.location.replace("/auth/sign-in")}>{t("auth.signIn")}</Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          {account.isPending ? <p role="status">{t("auth.loadingAccount")}</p> : account.isError ? (
            <div role="alert" className="space-y-3"><p>{t("auth.accountError")}</p><Button className="h-11" onClick={() => void account.refetch()}>{t("common.retry")}</Button></div>
          ) : <div><p className="text-title-sm">{account.data.name}</p><p className="text-body-sm text-muted-foreground">{account.data.email}</p></div>}
          {error && <p role="alert" className="text-body-sm text-destructive">{t("auth.signOutError")}</p>}
          <Button className="h-11 w-full" variant="outline" disabled={signingOut} onClick={() => void signOut()}>{signingOut ? t("auth.signingOut") : t("auth.signOut")}</Button>
        </div>
      )}
    </div>
  );
}
