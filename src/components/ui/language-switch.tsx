"use client";

import clsx from "clsx";
import { useI18n } from "@/i18n/client";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

const LABEL: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  es: { short: "ES", name: "Español" },
};

/** Stores the language the proxy routes by and reloads the page in it. */
export function switchLanguage(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}

/**
 * EN · ES toggle. Saves the choice in the cookie the proxy routes by and reloads, so every
 * cached page and prefetched section comes back in the new language.
 */
export function LanguageSwitch({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const { lang, t } = useI18n();
  const choose = (next: Locale) => {
    if (next !== lang) switchLanguage(next);
  };
  return (
    <div
      role="group"
      aria-label={t({ en: "Language", es: "Idioma" })}
      className={clsx(
        "inline-flex items-center rounded-full p-0.5 text-xs font-extrabold tracking-wide",
        tone === "dark" ? "bg-sea-950/60 ring-1 ring-foam/20" : "bg-parchment-2 ring-1 ring-parchment-3",
        className,
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          title={LABEL[l].name}
          onClick={() => choose(l)}
          className={clsx(
            "min-h-8 min-w-10 rounded-full px-2.5 transition-colors duration-150",
            l === lang
              ? tone === "dark"
                ? "bg-foam text-sea-950"
                : "bg-bronze text-parchment"
              : tone === "dark"
                ? "text-foam/75 hover:text-foam"
                : "text-ink-soft hover:text-ink",
          )}
        >
          {LABEL[l].short}
        </button>
      ))}
    </div>
  );
}
