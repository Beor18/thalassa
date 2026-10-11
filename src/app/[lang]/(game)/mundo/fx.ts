import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { WorldFx } from "@/components/world/types";

const has = (src: string) => existsSync(join(process.cwd(), "public", src));
const pick = (src: string) => (has(src) ? src : null);

/** Resolves the world map art, falling back to older assets when a file is not there yet. */
export function worldFx(): WorldFx {
  const sea = pick("/assets/fx/world-sea.webp");
  const ship = pick("/assets/fx/trireme-top.webp");
  return {
    sea: sea ?? "/assets/tile-sea.webp",
    seaSize: sea ? 1600 : 720,
    caustics: pick("/assets/fx/caustics.webp"),
    clouds: ["/assets/fx/cloud-1.webp", "/assets/fx/cloud-2.webp", "/assets/fx/cloud-3.webp"].filter(has),
    gull: pick("/assets/fx/seagull.webp"),
    compass: pick("/assets/fx/compass-rose.webp"),
    ship: ship ?? "/assets/u-ship.webp",
    shipTopDown: ship !== null,
    sparkle: pick("/assets/fx/sparkle.webp"),
    smoke: pick("/assets/fx/smoke.webp"),
  };
}
