import type { Locale, Text } from "@/i18n/config";

/**
 * Public base URL for absolute links (sitemap, Open Graph, JSON-LD, invite links before hydration).
 * Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is the fallback.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Thalassa";
export const SITE_TAGLINE: Text = { en: "Your polis in the Aegean", es: "Tu polis en el Egeo" };
export const SITE_DESCRIPTION: Text = {
  en: "Build an empire in the Aegean, ten minutes a day. Old-school browser strategy: found your polis, trade and conquer. Nothing to install, no real money.",
  es: "Estrategia por navegador como la de antes. Fundá tu polis en el Egeo, comerciá entre islas y conquistá el archipiélago. Sin instalar nada y sin plata real.",
};

/** "Thalassa · Your polis in the Aegean" / "Thalassa · Tu polis en el Egeo" */
export const siteTitle = (lang: Locale) => `${SITE_NAME} · ${SITE_TAGLINE[lang]}`;

/** The landing's share image lives at /{lang}/opengraph-image/{HOME_OG_IMAGE_ID} (src/app/[lang]/opengraph-image.tsx). */
export const HOME_OG_IMAGE_ID = "card";
