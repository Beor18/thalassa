// Convert the ChatGPT art pack into web-sized WebP files under public/assets.
// Usage: node scripts/import-art.mjs [--out public/assets/fx] <dir-with-pngs> [<dir> ...]
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = path.resolve(outIdx >= 0 ? args.splice(outIdx, 2)[1] : "public/assets");
const SIZES = [
  [/^scene-|^hero/, { width: 1920, quality: 80 }],
  [/^tile-sea/, { width: 512, quality: 82 }],
  [/^island-/, { width: 384, quality: 85 }],
  [/^b-/, { width: 512, quality: 85 }],
  [/^f-/, { width: 384, quality: 85 }],
  [/^u-/, { width: 384, quality: 85 }],
  [/^r-/, { width: 128, quality: 90 }],
  // effects pack
  [/^world-sea/, { width: 2048, quality: 78 }],
  [/^cloud-/, { width: 1024, quality: 80 }],
  [/^compass-rose/, { width: 512, quality: 88 }],
  [/^trireme-top/, { width: 384, quality: 88 }],
  [/^sparkle/, { width: 384, quality: 88 }],
  [/^caustics/, { width: 512, quality: 85 }],
  [/^(seagull|smoke)/, { width: 256, quality: 88 }],
];

await mkdir(OUT, { recursive: true });
for (const dir of args) {
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".png") || file.startsWith("contact-sheet")) continue;
    const rule = SIZES.find(([re]) => re.test(file));
    if (!rule) continue;
    const { width, quality } = rule[1];
    const out = path.join(OUT, file.replace(/\.png$/, ".webp"));
    const info = await sharp(path.join(dir, file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, alphaQuality: 90, effort: 5 })
      .toFile(out);
    console.log(file, "->", path.basename(out), `${info.width}x${info.height}`, `${Math.round(info.size / 1024)}KB`);
  }
}
