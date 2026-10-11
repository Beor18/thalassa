import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./config";
import { makeI18n, toLocale, type I18n } from "./i18n";

/**
 * Server Actions and Route Handlers can't read root params: they use the language cookie,
 * the same one the proxy routes by (English when it's missing).
 */
export async function getRequestI18n(): Promise<I18n> {
  return makeI18n(toLocale((await cookies()).get(LOCALE_COOKIE)?.value));
}
