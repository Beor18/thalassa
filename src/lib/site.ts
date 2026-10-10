/**
 * Public base URL for absolute links (sitemap, Open Graph, JSON-LD, invite links before hydration).
 * Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is the fallback.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Thalassa";
export const SITE_TAGLINE = "Tu polis en el Egeo";
export const SITE_DESCRIPTION =
  "Estrategia por navegador en el Egeo. Fundá tu polis, comerciá entre islas y conquistá el archipiélago. Se juega en la red de prueba de Solana, sin plata real.";
