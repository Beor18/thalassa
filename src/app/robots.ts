import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public: landing, polis pages and legal pages. Private: the game itself, the API and invite redirects. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/r/",
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
