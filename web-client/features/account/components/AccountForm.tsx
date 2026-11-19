"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "../api/auth-client";

const formSchema = z.object({
  name: z.string().max(100),
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof formSchema>;

export function AccountForm(): React.JSX.Element {
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(signup ? formSchema : formSchema.extend({ name: z.string() })),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = async (values: FormValues): Promise<void> => {
    setFailure("");
    setMessage("");
    if (signup && (!values.name.trim() || values.password.length < 8)) {
      setFailure("Enter your name and a password of at least 8 characters.");
      return;
    }
    try {
      const result = signup
        ? await authClient.signUp.email({ ...values, name: values.name.trim() })
        : await authClient.signIn.email({ email: values.email, password: values.password });
      if (result.error) {
        setFailure(result.error.message ?? "Authentication failed.");
      } else if (signup && !result.data?.token) {
        setMessage("Account created. Check your email if verification is required, then sign in.");
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Authentication request failed.");
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-headline-md">{signup ? "Create account" : "Sign in"}</h2>
      {signup && <label className="block space-y-1 text-body-md">Name<Input className="h-11" autoComplete="name" {...register("name")} /></label>}
      {signup && errors.name && <p role="alert" className="text-body-sm text-destructive">{errors.name.message}</p>}
      <label className="block space-y-1 text-body-md">Email<Input className="h-11" type="email" autoComplete="email" {...register("email")} /></label>
      {errors.email && <p role="alert" className="text-body-sm text-destructive">{errors.email.message}</p>}
      <label className="block space-y-1 text-body-md">Password<Input className="h-11" type="password" autoComplete={signup ? "new-password" : "current-password"} {...register("password")} /></label>
      {errors.password && <p role="alert" className="text-body-sm text-destructive">{errors.password.message}</p>}
      {failure && <p role="alert" className="text-body-sm text-destructive">{failure}</p>}
      {message && <p role="status" className="text-body-sm">{message}</p>}
      <Button className="h-12 w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : signup ? "Create account" : "Sign in"}</Button>
      <Button className="h-11 w-full" type="button" variant="outline" onClick={() => { setSignup(!signup); setFailure(""); setMessage(""); }}>
        {signup ? "Already have an account? Sign in" : "New here? Create an account"}
      </Button>
    </form>
  );
}
