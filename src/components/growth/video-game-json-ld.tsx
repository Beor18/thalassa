import { getI18n } from "@/i18n/server";
import { HOME_OG_IMAGE_ID, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * schema.org VideoGame for the landing, so search engines and AI answers know what Thalassa is.
 * Server Component, static per language: render it anywhere inside the landing page.
 */
export async function VideoGameJsonLd() {
  const { lang, t } = await getI18n();
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE_NAME,
    alternateName: t({ en: "Thalassa, your polis in the Aegean", es: "Thalassa, tu polis en el Egeo" }),
    url: `${SITE_URL}/`,
    description: t(SITE_DESCRIPTION),
    image: `${SITE_URL}/${lang}/opengraph-image/${HOME_OG_IMAGE_ID}`,
    inLanguage: lang === "en" ? "en" : "es",
    genre: lang === "en" ? ["Strategy", "Browser game", "City builder"] : ["Estrategia", "Juego de navegador", "Construcción de ciudades"],
    gamePlatform: lang === "en" ? ["Web browser", "PC", "Mobile"] : ["Navegador web", "PC", "Celular"],
    applicationCategory: "Game",
    operatingSystem: t({ en: "Any with a modern browser", es: "Cualquiera con navegador moderno" }),
    playMode: ["MultiPlayer", "SinglePlayer"],
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1 },
    gameLocation: t({ en: "Aegean Sea archipelago", es: "Archipiélago del mar Egeo" }),
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
