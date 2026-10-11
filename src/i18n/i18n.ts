import { DEFAULT_LOCALE, isLocale, type Locale, type Text } from "./config";
import { getFormat, type Format } from "./format";

/** Everything a component needs to speak the player's language. */
export type I18n = Format & {
  lang: Locale;
  /** Picks the copy for the current language. */
  t: (text: Text) => string;
};

const cache = new Map<Locale, I18n>();

export function makeI18n(lang: Locale): I18n {
  let i = cache.get(lang);
  if (!i) cache.set(lang, (i = { ...getFormat(lang), lang, t: (text) => text[lang] }));
  return i;
}

export const toLocale = (value: unknown): Locale => (isLocale(value) ? value : DEFAULT_LOCALE);
