import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Static on purpose: no database at build time. Polis pages are discovered through shared links;
 * once there are players worth indexing, add the top ranked cities here with a cached query.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
