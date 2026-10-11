import type { LuxuryResource } from "@/game/data";
import type { Locale, Text } from "@/i18n/config";

const MINE_NAME: Record<LuxuryResource, Text> = {
  wine: { en: "Vineyard", es: "Viñedo" },
  marble: { en: "Quarry", es: "Cantera" },
  crystal: { en: "Crystal Mine", es: "Mina de cristal" },
  sulfur: { en: "Sulfur Pit", es: "Mina de azufre" },
};

/** The island's luxury mine as the player reads it: "Quarry" or "Cantera". */
export const mineName = (resource: LuxuryResource, lang: Locale) => MINE_NAME[resource][lang];
