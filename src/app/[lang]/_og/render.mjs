// Renders the landing's share image (1200×630 JPEG) once per language into this folder.
// The art is a photo-like painting: as PNG (all next/og can output) it weighs 2+ MB and messaging
// apps drop previews that heavy, so the cards are rendered here once and served as ~190 KB JPEGs
// by ../opengraph-image.tsx. Run again after changing the copy below or the hero art:
//   node "src/app/[lang]/_og/render.mjs"
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement as h } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

// Keep in sync with SITE_TAGLINE (src/lib/site.ts) and the hooks on the landing.
const COPY = {
  en: { tagline: "Your polis in the Aegean", line: "Ten minutes a day. It grows while you’re away." },
  es: { tagline: "Tu polis en el Egeo", line: "Diez minutos al día. Crece sola mientras vivís tu vida." },
};

const root = process.cwd();
const here = join(root, "src/app/[lang]/_og");
const [cinzel, alegreya, art] = await Promise.all([
  readFile(join(root, "src/server/growth/og-assets/cinzel-700.woff")),
  readFile(join(root, "src/server/growth/og-assets/alegreya-sans-700.woff")),
  // The renderer can't draw WebP: hand it the hero as a JPEG, cropped to the card.
  sharp(join(root, "public/assets/hero.webp"))
    .resize({ width: 1200 })
    .extract({ left: 0, top: 64, width: 1200, height: 630 })
    .jpeg({ quality: 95 })
    .toBuffer(),
]);
const artUrl = `data:image/jpeg;base64,${art.toString("base64")}`;
const full = { position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex" };

function card({ tagline, line }) {
  return h(
    "div",
    { style: { width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: "#061a30" } },
    h("img", { src: artUrl, width: 1200, height: 630, style: { position: "absolute", left: 0, top: 0 } }),
    h("div", {
      style: {
        ...full,
        backgroundImage:
          "linear-gradient(to top, rgba(6,26,48,0.94) 0%, rgba(6,26,48,0.72) 22%, rgba(6,26,48,0.2) 46%, rgba(6,26,48,0) 62%)",
      },
    }),
    h("div", {
      style: { ...full, backgroundImage: "linear-gradient(to right, rgba(6,26,48,0.45) 0%, rgba(6,26,48,0.1) 40%, rgba(6,26,48,0) 60%)" },
    }),
    h("div", { style: { position: "absolute", left: 0, top: 0, width: 1200, height: 10, display: "flex", backgroundColor: "#e3b341" } }),
    h(
      "div",
      { style: { position: "absolute", left: 64, right: 64, bottom: 54, display: "flex", flexDirection: "column", gap: 10 } },
      h(
        "div",
        {
          style: {
            fontFamily: "Cinzel",
            fontSize: 124,
            lineHeight: 1,
            letterSpacing: 15,
            color: "#e3b341",
            textShadow: "0 3px 0 #7a4f18, 0 10px 34px rgba(6,26,48,0.9)",
          },
        },
        "THALASSA",
      ),
      h("div", { style: { fontFamily: "Alegreya", fontSize: 54, lineHeight: 1.1, color: "#f7f4ee", textShadow: "0 2px 14px rgba(6,26,48,0.95)" } }, tagline),
      h("div", { style: { fontFamily: "Alegreya", fontSize: 32, color: "#e6f3fb", textShadow: "0 1px 10px rgba(6,26,48,0.95)" } }, line),
    ),
  );
}

for (const [lang, copy] of Object.entries(COPY)) {
  const png = Buffer.from(
    await new ImageResponse(card(copy), {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Cinzel", data: cinzel, style: "normal", weight: 700 },
        { name: "Alegreya", data: alegreya, style: "normal", weight: 700 },
      ],
    }).arrayBuffer(),
  );
  const out = join(here, `home-${lang}.jpg`);
  const info = await sharp(png).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(out);
  console.log(`${lang}: ${out} ${Math.round(info.size / 1024)} KB`);
}
