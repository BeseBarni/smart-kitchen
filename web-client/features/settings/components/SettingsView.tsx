"use client";

import { toast } from "sonner";
import { useLanguageStore, useText, type SupportedLocale } from "@/lib/i18n";
import { useLanguageStorageStatus } from "@/lib/i18n/language.store";
import { resolveText } from "@/lib/i18n/orchestrator";
import { LanguageSelector } from "./LanguageSelector";
import { AvatarUploadSection } from "./AvatarUploadSection";

export function SettingsView(): React.JSX.Element {
  const { t, locale, setLocale } = useText();
  const hasHydrated = useLanguageStore((state) => state.hasHydrated);
  const change = (next: SupportedLocale): void => {
    if (next === locale) return;
    setLocale(next);
    if (!useLanguageStorageStatus.getState().failed) toast.success(resolveText(next, "settings.changed"));
  };
  return (
    <div className="space-y-4">
      <AvatarUploadSection />
      <LanguageSelector value={locale} onChange={change} title={t("settings.title")} description={t("settings.description")} label={t("settings.selector")} disabled={!hasHydrated} />
    </div>
  );
}
