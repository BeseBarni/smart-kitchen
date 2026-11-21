"use client";

import { useText } from "@/lib/i18n";

export function AuthHeading(): React.JSX.Element {
  const { t } = useText();
  return <div className="mb-6 space-y-1">
    <p className="text-title-sm text-primary">{t("common.appName")}</p>
    <h1 className="text-headline-lg">{t("auth.welcome")}</h1>
  </div>;
}
