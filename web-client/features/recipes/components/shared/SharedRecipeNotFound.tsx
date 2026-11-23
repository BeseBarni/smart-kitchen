"use client";

import { CircleOff } from "lucide-react";
import { useText } from "@/lib/i18n";

export function SharedRecipeNotFound(): React.JSX.Element {
  const { t } = useText();
  return (
    <section className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CircleOff size={28} aria-hidden="true" />
      </div>
      <h1 className="text-headline-lg-mobile">{t("recipes.shareNotFoundTitle")}</h1>
      <p className="max-w-md text-body-md text-muted-foreground">{t("recipes.shareNotFoundDescription")}</p>
    </section>
  );
}
