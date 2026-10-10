import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "./site";

const title = `${SITE_NAME} · ${SITE_TAGLINE}`;

/**
 * Root metadata for src/app/layout.tsx (`export const metadata = rootMetadata;`).
 * Absolute URLs come from metadataBase; the share image is the file convention src/app/opengraph-image.jpg,
 * which Next.js adds on its own and which wins over anything set here.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: SITE_NAME,
    title,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title, description: SITE_DESCRIPTION },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  category: "games",
};
