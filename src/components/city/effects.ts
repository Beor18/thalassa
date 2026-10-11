import { BALANCE, BUILDINGS, RESOURCES, RESOURCE_INFO, UNITS, UNIT_TYPES, emptyBag, type BuildingType, type ResourceBag } from "@/game/data";
import {
  buildingCost,
  buildingLevel,
  buildingSeconds,
  hasTech,
  housing,
  maxScientists,
  maxShips,
  safeAmount,
  storageCap,
  type CityRates,
  type CityState,
  type PlayerState,
} from "@/game/engine";
import { fmt } from "@/lib/format";
import { missingText } from "./lib";

/*
  Read-only previews for the city panels: what the next level gives, when the city can pay a cost
  and which upgrades are ready. They only call engine formulas on copies; game rules live in the engine.
*/

/** Copy of the city with the building on `slot` at `level` (added when the plot is empty). */
export function withLevel(city: CityState, slot: number, type: BuildingType, level: number): CityState {
  const has = city.buildings.some((b) => b.slot === slot);
  const buildings = has
    ? city.buildings.map((b) => (b.slot === slot ? { ...b, level } : b))
    : [...city.buildings, { slot, type, level }];
  return { ...city, buildings };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const barracksCut = (level: number) => Math.min(0.4, level * 0.02);
const woodCut = (p: PlayerState, carpenter: number) => Math.min(0.5, carpenter * 0.02 + (hasTech(p, "pulley") ? 0.1 : 0));

/** Short phrases for what `level` adds over the level before it ("+55 viviendas"). Empty when nothing measurable changes. */
export function levelGain(p: PlayerState, city: CityState, slot: number, type: BuildingType, level: number): string[] {
  const before = withLevel(city, slot, type, level - 1);
  const after = withLevel(city, slot, type, level);
  const out: string[] = [];
  switch (type) {
    case "town_hall":
      out.push(`+${fmt(housing(after) - housing(before))} viviendas`);
      break;
    case "academy":
      out.push(`+${fmt(maxScientists(after) - maxScientists(before))} pupitres`);
      break;
    case "warehouse":
      out.push(`+${fmt(storageCap(p, after) - storageCap(p, before))} de capacidad`, `+${fmt(safeAmount(after) - safeAmount(before))} a salvo`);
      break;
    case "tavern":
      out.push(`+${BALANCE.tavernHappinessPerLevel} satisfacción`, `vino hasta nivel ${level}`);
      break;
    case "museum":
      out.push(`+${BALANCE.museumHappinessPerLevel} satisfacción`);
      break;
    case "barracks": {
      const faster = barracksCut(buildingLevel(after, "barracks")) - barracksCut(buildingLevel(before, "barracks"));
      if (faster > 0) out.push(`entrena ${pct(faster)} más rápido`);
      const unlocked = UNIT_TYPES.filter((u) => UNITS[u].requires.barracks === level).map((u) => UNITS[u].name);
      if (unlocked.length) out.push(`habilita ${unlocked.join(" y ")}`);
      break;
    }
    case "port":
      out.push(`+${fmt(maxShips(after) - maxShips(before))} amarras`);
      break;
    case "wall":
      out.push("+10% defensa");
      break;
    case "carpenter": {
      const saved = woodCut(p, buildingLevel(after, "carpenter")) - woodCut(p, buildingLevel(before, "carpenter"));
      if (saved > 0.0001) out.push(`−${pct(saved)} de madera en obras`);
      break;
    }
    case "stonemason":
      out.push(`+3% de ${RESOURCE_INFO[city.island.resource].label.toLowerCase()}`);
      break;
    case "palace":
      out.push("+1 colonia");
      break;
  }
  return out;
}

/** Net production per hour of each resource (wine net of what the tavern serves). */
export function netRates(rates: CityRates): ResourceBag {
  const bag = emptyBag();
  bag.wood = rates.wood;
  bag[rates.luxuryResource] += rates.luxury;
  bag.wine -= rates.wineUse;
  return bag;
}

export interface Affordability {
  /** "Te falta 120 de madera." or null when the city can pay. */
  missing: string | null;
  /** How long until production covers what's missing; null when it can pay now or never will at today's rates. */
  etaMs: number | null;
  /** Some amount is above what the warehouse holds: it can never be paid without a bigger Depósito. */
  tooBig: boolean;
}

export function affordability(cost: Partial<ResourceBag>, city: { res: ResourceBag; rates: CityRates }): Affordability {
  const missing = missingText(cost, city.res);
  const tooBig = RESOURCES.some((r) => (cost[r] ?? 0) > city.rates.storage);
  if (!missing || tooBig) return { missing, etaMs: null, tooBig };
  const rates = netRates(city.rates);
  let hours = 0;
  for (const r of RESOURCES) {
    const need = (cost[r] ?? 0) - city.res[r];
    if (need <= 1e-6) continue;
    if (rates[r] <= 0) return { missing, etaMs: null, tooBig };
    hours = Math.max(hours, need / rates[r]);
  }
  return { missing, etaMs: hours * 3_600_000, tooBig };
}

export interface UpgradeOption {
  slot: number;
  type: BuildingType;
  next: number;
  cost: ResourceBag;
  seconds: number;
}

/** Buildings the city can upgrade right now with what it has (none while a construction is running). */
export function readyUpgrades(p: PlayerState, city: CityState & { rates: CityRates }, speed: number): UpgradeOption[] {
  if (city.construction) return [];
  return city.buildings
    .filter((b) => b.level < BUILDINGS[b.type].maxLevel)
    .map((b) => ({
      slot: b.slot,
      type: b.type,
      next: b.level + 1,
      cost: buildingCost(p, city, b.type, b.level + 1),
      seconds: buildingSeconds(p, b.type, b.level + 1, speed),
    }))
    .filter((o) => missingText(o.cost, city.res) == null)
    .sort((a, b) => a.slot - b.slot);
}
