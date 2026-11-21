"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useText, type TranslationKey } from "@/lib/i18n";
import { authClient } from "../api/auth-client";

const formSchema = z.object({
  name: z.string().max(100),
  email: z.email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

function GoogleSignInError(): React.JSX.Element | null {
  const searchParams = useSearchParams();
  const { t } = useText();
  return searchParams.get("error") === "google"
    ? <p role="alert" className="text-body-sm text-destructive">{t("auth.googleError")}</p>
    : null;
}

export function AccountForm(): React.JSX.Element {
  const { t } = useText();
  const client = useQueryClient();
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(signup ? formSchema : formSchema.extend({ name: z.string() })),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = async (values: FormValues): Promise<void> => {
    setFailure(null);
    setMessage(null);
    if (signup && (!values.name.trim() || values.password.length < 8)) {
      setFailure("auth.namePasswordError");
      return;
    }
    try {
      const result = signup
        ? await authClient.signUp.email({ ...values, name: values.name.trim() })
        : await authClient.signIn.email({ email: values.email, password: values.password });
      if (result.error) {
        setFailure("auth.authError");
      } else if (signup && !result.data?.token) {
        setMessage("auth.accountCreated");
      } else {
        const session = await authClient.getSession();
        if (session.error) {
          setFailure("auth.verifyError");
        } else if (!session.data?.user) {
          setFailure("auth.verifyError");
        } else {
          client.clear();
          window.location.replace("/chat");
        }
      }
    } catch (error) {
      console.error("Authentication request failed:", error);
      setFailure("auth.authError");
    }
  };
  const signInWithGoogle = async (): Promise<void> => {
    setFailure(null);
    setMessage(null);
    setGooglePending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/chat`,
        errorCallbackURL: `${window.location.origin}/auth/sign-in?error=google`,
      });
      if (result.error) setFailure("auth.googleError");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setFailure("auth.googleError");
    } finally {
      setGooglePending(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-headline-md">{t(signup ? "auth.createAccount" : "auth.signIn")}</h2>
      {signup && <label className="block space-y-1 text-body-md">{t("auth.name")}<Input className="h-11" autoComplete="name" {...register("name")} /></label>}
      {signup && errors.name && <p role="alert" className="text-body-sm text-destructive">{t("auth.namePasswordError")}</p>}
      <label className="block space-y-1 text-body-md">{t("auth.email")}<Input className="h-11" type="email" autoComplete="email" {...register("email")} /></label>
      {errors.email && <p role="alert" className="text-body-sm text-destructive">{t("auth.emailError")}</p>}
      <label className="block space-y-1 text-body-md">{t("auth.password")}<Input className="h-11" type="password" autoComplete={signup ? "new-password" : "current-password"} {...register("password")} /></label>
      {errors.password && <p role="alert" className="text-body-sm text-destructive">{t("auth.passwordError")}</p>}
      {failure && <p role="alert" className="text-body-sm text-destructive">{t(failure)}</p>}
      {!failure && <Suspense><GoogleSignInError /></Suspense>}
      {message && <p role="status" className="text-body-sm">{t(message)}</p>}
      <Button className="h-12 w-full" type="submit" disabled={isSubmitting || googlePending}>{t(isSubmitting ? "auth.waiting" : signup ? "auth.createAccount" : "auth.signIn")}</Button>
      <Button className="h-11 w-full" type="button" variant="outline" disabled={isSubmitting || googlePending} onClick={() => void signInWithGoogle()}>
        {t(googlePending ? "auth.connectingGoogle" : "auth.continueGoogle")}
      </Button>
      <Button className="h-11 w-full" type="button" variant="outline" disabled={isSubmitting || googlePending} onClick={() => { setSignup(!signup); setFailure(null); setMessage(null); }}>
        {t(signup ? "auth.existingAccount" : "auth.newAccount")}
      </Button>
    </form>
  );
}
