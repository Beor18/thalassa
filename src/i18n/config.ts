/** Languages the game speaks. English is the default; Spanish is one switch away. */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Remembers the player's choice. Read by the proxy (routing) and by Server Actions (messages). */
export const LOCALE_COOKIE = "thalassa_lang";

export const isLocale = (value: unknown): value is Locale => value === "en" || value === "es";

/** A piece of copy in every language, written next to where it's used: t({ en: "Build", es: "Construir" }). */
export type Text = Record<Locale, string>;
