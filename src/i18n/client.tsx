"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { makeI18n, type I18n } from "./i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once in the root layout from the route's [lang]. */
export function I18nProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  return <LocaleContext value={lang}>{children}</LocaleContext>;
}

/** Client Components: t(), formatters and the current language. */
export function useI18n(): I18n {
  return makeI18n(useContext(LocaleContext));
}

const LANG_SEGMENT = /^\/(en|es)(?=\/|$)/;

/**
 * usePathname without the internal language segment. Prerendered shells are built at /en/ranking
 * while the browser shows /ranking; reading the raw path there made server and client disagree.
 */
export function usePagePathname(): string {
  return usePathname().replace(LANG_SEGMENT, "") || "/";
}
