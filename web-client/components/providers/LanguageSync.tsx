"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { languageStore, useLanguageStorageStatus } from "@/lib/i18n/language.store";
import { useText } from "@/lib/i18n";

let hydration: Promise<void> | undefined;

export function LanguageSync(): null {
  const { locale, t } = useText();
  const failed = useLanguageStorageStatus((state) => state.failed);
  const previousFailure = useRef(false);
  useEffect(() => {
    hydration ??= Promise.resolve(languageStore.persist.rehydrate());
    void hydration;
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("common.appName");
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = t("common.appDescription");
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) manifest.href = `/manifest.${locale}.webmanifest`;
  }, [locale, t]);
  useEffect(() => {
    if (failed && !previousFailure.current) toast.warning(t("settings.storageError"));
    previousFailure.current = failed;
  }, [failed, t]);
  return null;
}
