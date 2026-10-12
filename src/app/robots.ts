import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public: landing, polis pages and legal pages. Private: the game itself and the API.
 * Invite links (/r/) stay crawlable so X can draw their card (Twitterbot obeys robots.txt); they send
 * `x-robots-tag: noindex` instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/salir",
        "/ciudad",
        "/isla",
        "/mundo",
        "/investigacion",
        "/militar",
        "/informes",
        "/ranking",
        "/tesoro",
        "/invitar",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
