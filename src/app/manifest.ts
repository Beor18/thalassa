import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

/** Installable web app: the polis one tap away on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Thalassa · Tu polis en el Egeo",
    short_name: "Thalassa",
    description: SITE_DESCRIPTION,
    lang: "es",
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
