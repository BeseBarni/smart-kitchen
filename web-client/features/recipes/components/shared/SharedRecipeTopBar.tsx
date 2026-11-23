"use client";

import { useEffect } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LOCALE_META, SUPPORTED_LOCALES, useLanguageStore, useText } from "@/lib/i18n";

export function SharedRecipeTopBar(): React.JSX.Element {
  const { locale, t } = useText();
  const setLocale = useLanguageStore((state) => state.setLocale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].tag;
  }, [locale]);

  const copyLink = (): void => {
    if (!navigator.clipboard) {
      toast.error(t("recipes.shareCopyError"));
      return;
    }
    void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`).then(
      () => toast.success(t("recipes.shareCopied")),
      () => toast.error(t("recipes.shareCopyError")),
    );
  };

  return (
    <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border/70 bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex gap-1" role="group" aria-label={t("recipes.shareLanguageLabel")}>
        {SUPPORTED_LOCALES.map((language) => (
          <Button
            key={language}
            type="button"
            variant={locale === language ? "secondary" : "ghost"}
            className="min-h-11 min-w-11 px-2"
            aria-pressed={locale === language}
            onClick={() => setLocale(language)}
          >
            {language.toUpperCase()}
          </Button>
        ))}
      </div>
      <Button type="button" variant="outline" className="min-h-11" onClick={copyLink}>
        <Copy aria-hidden="true" />
        {t("recipes.shareCopyLink")}
      </Button>
    </header>
  );
}
