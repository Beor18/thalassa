import sharp from "sharp";
import { readdirSync } from "node:fs";
const dir = "public/assets";
for (const f of readdirSync(dir).filter((f) => /^(b|f|u)-/.test(f)).sort()) {
  const { data, info } = await sharp(`${dir}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const p = (v, t) => Math.round((v / t) * 100);
  console.log(f.padEnd(22), `x ${p(minX, info.width)}-${p(maxX, info.width)}%  y ${p(minY, info.height)}-${p(maxY, info.height)}%`);
}
