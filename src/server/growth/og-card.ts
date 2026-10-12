import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
  Shared pieces of the share cards drawn with next/og (polis card, invite card).
  File reads live in cached helpers: with Cache Components a route can't do uncached IO.
*/

export const OG_SIZE = { width: 1200, height: 630 };

async function fontData() {
  "use cache";
  const root = process.cwd();
  const [cinzel, alegreya] = await Promise.all([
    readFile(join(root, "src/server/growth/og-assets/cinzel-700.woff"), "base64"),
    readFile(join(root, "src/server/growth/og-assets/alegreya-sans-700.woff"), "base64"),
  ]);
  return { cinzel, alegreya };
}

/** Fonts for ImageResponse: Cinzel for titles, Alegreya for everything else. */
export async function ogFonts() {
  const { cinzel, alegreya } = await fontData();
  return [
    { name: "Cinzel", data: Buffer.from(cinzel, "base64"), style: "normal" as const, weight: 700 as const },
    { name: "Alegreya", data: Buffer.from(alegreya, "base64"), style: "normal" as const, weight: 700 as const },
  ];
}

/** PNG copy of the building art as a data URL (the renderer can't draw WebP). See og-assets/NOTES.txt. */
export async function buildingArt(type: string) {
  "use cache";
  if (!/^[a-z_]+$/.test(type)) return null;
  try {
    const data = await readFile(join(process.cwd(), "src/server/growth/og-assets/buildings", `b-${type}.png`), "base64");
    return `data:image/png;base64,${data}`;
  } catch {
    return null;
  }
}

/**
 * Flat sea behind the cards: a photo-like background would weigh 1.5 MB as PNG and messaging apps
 * (WhatsApp first) drop previews that heavy.
 */
export const OG_SEA = {
  backgroundColor: "#0b2a4a",
  backgroundImage: "radial-gradient(circle at 78% 58%, #1f6fb2 0%, #134a7c 28%, #0b2a4a 55%, #061a30 100%)",
};
