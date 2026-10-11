import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, siteTitle } from "@/lib/site";

/**
 * Installable web app: the polis one tap away on the home screen.
 * The manifest has no route language, so it speaks the default one (English); the app itself follows the player's choice.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteTitle("en"),
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION.en,
    lang: "en",
    dir: "ltr",
    start_url: "/ciudad",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b2a4a",
    theme_color: "#0b2a4a",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
