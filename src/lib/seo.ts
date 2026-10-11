import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, siteTitle } from "./site";

/** Open Graph locale per language; each page also points to the other one. */
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_AR" };

/** The Open Graph fields every public page shares (a page's own openGraph replaces the parent's, so spread this in). */
export function openGraphBase(lang: Locale) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: OG_LOCALE[lang],
    alternateLocale: Object.entries(OG_LOCALE)
      .filter(([l]) => l !== lang)
      .map(([, og]) => og),
  };
}

/**
 * Root metadata for src/app/[lang]/layout.tsx (`export const generateMetadata = rootMetadata;`), in the route's language.
 * Absolute URLs come from metadataBase; the share image is the file convention src/app/[lang]/opengraph-image.tsx,
 * which Next.js adds on its own and which wins over anything set here.
 */
export async function rootMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  const title = siteTitle(lang);
  const description = t(SITE_DESCRIPTION);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    openGraph: { ...openGraphBase(lang), title, description },
    twitter: { card: "summary_large_image", title, description },
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false, email: false, address: false },
    category: "games",
  };
}
