import { lang as rootLang } from "next/root-params";
import { makeI18n, toLocale, type I18n } from "./i18n";

/** Server Components: the language comes from the route ([lang], set by the proxy). Static-friendly. */
export async function getI18n(): Promise<I18n> {
  return makeI18n(toLocale(await rootLang()));
}
