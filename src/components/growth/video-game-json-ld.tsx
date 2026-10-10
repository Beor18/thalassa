import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * schema.org VideoGame for the landing, so search engines and AI answers know what Thalassa is.
 * Server Component, static: render it anywhere inside the landing page.
 */
export function VideoGameJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE_NAME,
    alternateName: "Thalassa, tu polis en el Egeo",
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    image: `${SITE_URL}/opengraph-image.jpg`,
    inLanguage: "es",
    genre: ["Estrategia", "Juego de navegador", "Construcción de ciudades"],
    gamePlatform: ["Navegador web", "PC", "Celular"],
    applicationCategory: "Game",
    operatingSystem: "Cualquiera con navegador moderno",
    playMode: ["MultiPlayer", "SinglePlayer"],
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1 },
    gameLocation: "Archipiélago del mar Egeo",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${SITE_URL}/` },
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" so no string inside can close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
