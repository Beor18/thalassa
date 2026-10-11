/*
  Player-facing names of the game's things in every language. Spanish lives next to the rules in
  data.ts; English lives here. UI and server code ask these helpers instead of reading
  BUILDINGS[type].name directly, so the same building reads "Academia" or "Academy".
*/
import type { Locale } from "@/i18n/config";
import {
  BUILDINGS,
  RESOURCE_INFO,
  TECH_BRANCHES,
  TECHS,
  UNITS,
  type BuildingType,
  type TechBranch,
  type TechId,
  type UnitType,
} from "./data";

type ResourceKey = keyof typeof RESOURCE_INFO;

const EN_RESOURCES: Record<ResourceKey, string> = {
  wood: "Wood",
  wine: "Wine",
  marble: "Marble",
  crystal: "Crystal",
  sulfur: "Sulfur",
  gold: "Gold",
  research: "Research",
  citizens: "Citizens",
  ambrosia: "Nectar",
};

const EN_BUILDINGS: Record<BuildingType, { name: string; description: string }> = {
  town_hall: { name: "Town Hall", description: "The heart of your polis. Every level adds housing for your citizens." },
  academy: { name: "Academy", description: "Your scientists produce research points. More levels, more desks." },
  warehouse: { name: "Warehouse", description: "Stores more resources and keeps part of them safe from raids." },
  tavern: { name: "Tavern", description: "Serving wine keeps your people happy and your population growing faster." },
  museum: { name: "Museum", description: "Culture feeds the soul: every level adds satisfaction." },
  barracks: { name: "Barracks", description: "Train troops to defend your polis or to go raiding." },
  port: { name: "Port", description: "Buy merchant ships: they carry goods, colonists and troops." },
  wall: { name: "Town Wall", description: "Each level adds 10% defense to the troops guarding the city." },
  carpenter: { name: "Carpenter", description: "Cuts wood costs by 2% per level for every building in this city." },
  stonemason: { name: "Stonemason", description: "Its masters add 3% to the island's luxury resource production per level." },
  palace: { name: "Palace", description: "Seat of government. Each level lets you found one more colony." },
};

const EN_UNITS: Record<UnitType, { name: string; plural: string; description: string }> = {
  spearman: { name: "Spearman", plural: "Spearmen", description: "Cheap and steady. The front line of any polis." },
  slinger: { name: "Slinger", plural: "Slingers", description: "Hits from afar and costs little. Fragile up close." },
  swordsman: { name: "Swordsman", plural: "Swordsmen", description: "Strong attack, light armor. Made for raiding." },
  hoplite: { name: "Hoplite", plural: "Hoplites", description: "Shield, spear and phalanx. The best defense in the Aegean." },
  archer: { name: "Archer", plural: "Archers", description: "A rain of arrows before the enemy reaches the wall." },
  catapult: { name: "Catapult", plural: "Catapults", description: "Breaks walls. Every two catapults cancel one wall level." },
};

const ES_UNIT_PLURALS: Record<UnitType, string> = {
  spearman: "Lanceros",
  slinger: "Honderos",
  swordsman: "Espadachines",
  hoplite: "Hoplitas",
  archer: "Arqueros",
  catapult: "Catapultas",
};

const EN_TECHS: Record<TechId, { name: string; effect: string }> = {
  conservation: { name: "Conservation", effect: "+20% warehouse capacity." },
  pulley: { name: "Pulley", effect: "−10% wood cost for all buildings." },
  wealth: { name: "Wealth", effect: "Unlocks workers in the island's luxury mine and the Stonemason." },
  wine_culture: { name: "Wine Culture", effect: "Taverns use 20% less wine." },
  geometry: { name: "Geometry", effect: "−10% marble cost for all buildings." },
  architecture: { name: "Architecture", effect: "Buildings finish 10% faster." },
  wisdom: { name: "Wisdom", effect: "+10% research." },
  paper: { name: "Papyrus", effect: "+15% research." },
  expansion: { name: "Expansion", effect: "Unlocks the Palace and founding colonies." },
  culture: { name: "Culture", effect: "Unlocks the Museum." },
  drill: { name: "Drill", effect: "Training takes 10% less time." },
  phalanx: { name: "Phalanx", effect: "Unlocks Hoplites." },
  archery: { name: "Archery", effect: "Unlocks Archers." },
  siege: { name: "Siege", effect: "Unlocks Catapults." },
  shipbuilding: { name: "Shipbuilding", effect: "Ships cost 15% less gold." },
  cartography: { name: "Cartography", effect: "Sea voyages are 25% faster." },
};

const EN_BRANCHES: Record<TechBranch, string> = {
  economy: "Economy",
  science: "Science",
  military: "War",
  seafaring: "Seafaring",
};

export const resourceLabel = (key: ResourceKey, lang: Locale) => (lang === "en" ? EN_RESOURCES[key] : RESOURCE_INFO[key].label);

export const buildingName = (type: BuildingType, lang: Locale) => (lang === "en" ? EN_BUILDINGS[type].name : BUILDINGS[type].name);

export const buildingDescription = (type: BuildingType, lang: Locale) =>
  lang === "en" ? EN_BUILDINGS[type].description : BUILDINGS[type].description;

/** Singular by default; pass a count to get "1 Spearman" vs "20 Spearmen" style names. */
export const unitName = (unit: UnitType, lang: Locale, count = 1) =>
  lang === "en" ? (count === 1 ? EN_UNITS[unit].name : EN_UNITS[unit].plural) : count === 1 ? UNITS[unit].name : ES_UNIT_PLURALS[unit];

export const unitDescription = (unit: UnitType, lang: Locale) => (lang === "en" ? EN_UNITS[unit].description : UNITS[unit].description);

export const techName = (id: TechId, lang: Locale) => (lang === "en" ? EN_TECHS[id].name : TECHS[id].name);

export const techEffect = (id: TechId, lang: Locale) => (lang === "en" ? EN_TECHS[id].effect : TECHS[id].effect);

export const branchName = (branch: TechBranch, lang: Locale) => (lang === "en" ? EN_BRANCHES[branch] : TECH_BRANCHES[branch]);
