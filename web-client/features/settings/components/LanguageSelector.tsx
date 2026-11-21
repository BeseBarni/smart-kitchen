import { CheckCircle2, Circle, Globe } from "lucide-react";
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";

export function LanguageSelector({ value, onChange, title, description, label, disabled }: {
  value: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  title: string;
  description: string;
  label: string;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <section className="space-y-3 rounded-xl bg-stitch-surface-container-lowest p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stitch-secondary-container text-stitch-primary">
          <Globe size={20} aria-hidden="true" />
        </span>
        <div><h2 className="text-headline-md">{title}</h2><p className="mt-1 text-body-sm text-muted-foreground">{description}</p></div>
      </div>
      <fieldset aria-label={label} disabled={disabled} className="space-y-1">
        {SUPPORTED_LOCALES.map((locale) => (
          <label key={locale} className={`flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-3 py-2 focus-within:outline-2 focus-within:outline-ring ${value === locale ? "bg-stitch-primary-fixed text-stitch-on-primary-fixed" : "bg-stitch-surface-container-low"}`}>
            <span lang={locale}>{LOCALE_META[locale].label}</span>
            <input className="sr-only" type="radio" name="app-language" value={locale} checked={value === locale} onChange={() => onChange(locale)} />
            {value === locale ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
