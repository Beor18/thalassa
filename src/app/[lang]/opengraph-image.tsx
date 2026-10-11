import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeI18n, toLocale } from "@/i18n/i18n";
import { HOME_OG_IMAGE_ID } from "@/lib/site";

const size = { width: 1200, height: 630 };
const contentType = "image/jpeg";

/** One card per language; generateImageMetadata is what lets the alt text follow the route's language. */
export function generateImageMetadata({ params }: { params: { lang: string } }) {
  const { t } = makeI18n(toLocale(params.lang));
  return [
    {
      id: HOME_OG_IMAGE_ID,
      size,
      contentType,
      alt: t({
        en: "Thalassa: a harbor in the Aegean with triremes sailing in. Your polis in the Aegean.",
        es: "Thalassa: un puerto del Egeo con trirremes entrando. Tu polis en el Egeo.",
      }),
    },
  ];
}

/** The pre-rendered card as base64, cached: with Cache Components a route can't do uncached IO. */
async function cardData(lang: "en" | "es") {
  "use cache";
  return readFile(join(process.cwd(), "src/app/[lang]/_og", lang === "es" ? "home-es.jpg" : "home-en.jpg"), "base64");
}

/**
 * The landing's share image: the hero painting with the name and tagline in the page's language.
 * Pre-rendered JPEGs (see _og/render.mjs): the painting as PNG would be too heavy for messaging apps.
 * Route handler: root params aren't available here, so the language comes from the route's params.
 */
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang);
  const file = Buffer.from(await cardData(lang), "base64");
  return new Response(new Uint8Array(file), {
    headers: { "content-type": contentType, "cache-control": "public, max-age=86400, immutable" },
  });
}
