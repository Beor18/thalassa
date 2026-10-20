// Deterministic game simulation. No I/O: the server loads state, advances it to
// "now", applies a command and persists. Same input always yields same output.
import type { Locale, Text } from "@/i18n/config";
import { getFormat } from "@/i18n/format";
import {
  BALANCE,
  BUILDINGS,
  CITY_SLOTS,
  MAX_STEP_MS,
  RESOURCES,
  TECHS,
  UNITS,
  UNIT_TYPES,
  emptyBag,
  isNaval,
  unitYard,
  yardRequirement,
  type BuildingType,
  type LuxuryResource,
  type Resource,
  type ResourceBag,
  type TechId,
  type UnitBag,
  type UnitType,
  type Yard,
} from "./data";
import { buildingName, resourceLabel, techName } from "./names";

/** Amounts in each language's style: "1,200" in English, "1.200" in Spanish. */
const enNum = (n: number) => getFormat("en").fmt(n);
const esNum = (n: number) => getFormat("es").fmt(n);
const needsNectar = (n: number): Text => ({ en: `You need ${enNum(n)} Nectar.`, es: `Necesitás ${esNum(n)} de néctar.` });
const needsGold = (n: number): Text => ({ en: `You need ${enNum(n)} gold.`, es: `Necesitás ${esNum(n)} de oro.` });
const INVALID_AMOUNT: Text = { en: "Invalid amount.", es: "Cantidad inválida." };

/** A rule the player broke. Carries its message in every language; the action layer picks one. */
export class GameError extends Error {
  readonly text: Text;
  constructor(message: string | Text) {
    const text = typeof message === "string" ? { en: message, es: message } : message;
    super(text.en);
    this.name = "GameError";
    this.text = text;
  }
}

export interface BuildingState {
  slot: number;
  type: BuildingType;
  level: number;
}

export interface Construction {
  slot: number;
  type: BuildingType;
  targetLevel: number;
  startedAt: number;
  endsAt: number;
  cost: ResourceBag;
}

export interface TrainingBatch {
  id: string;
  unit: UnitType;
  count: number;
  startedAt: number;
  endsAt: number;
}

export interface IslandInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  resource: LuxuryResource;
  sawmillLevel: number;
  mineLevel: number;
}

export interface CityState {
  id: string;
  name: string;
  isCapital: boolean;
  islandId: number;
  slot: number;
  island: IslandInfo;
  res: ResourceBag;
  population: number;
  woodWorkers: number;
  luxWorkers: number;
  scientists: number;
  wineLevel: number;
  /** merchant ships docked in this city (ships at sea are tracked by missions) */
  ships: number;
  buildings: BuildingState[];
  units: UnitBag;
  construction: Construction | null;
  training: TrainingBatch[];
}

export interface PlayerState {
  id: string;
  name: string;
  wallet: string;
  gold: number;
  research: number;
  ambrosia: number;
  techs: TechId[];
  lastTick: number;
  /** gold/hour (speed 1) owed by units currently away on missions */
  awayUpkeep: number;
  cities: CityState[];
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const hasTech = (p: PlayerState, id: TechId) => p.techs.includes(id);

export function buildingLevel(city: CityState, type: BuildingType): number {
  return city.buildings.reduce((max, b) => (b.type === type && b.level > max ? b.level : max), 0);
}

export function sumLevels(city: CityState, type: BuildingType): number {
  return city.buildings.reduce((sum, b) => (b.type === type ? sum + b.level : sum), 0);
}

export function getCity(p: PlayerState, cityId: string): CityState {
  const city = p.cities.find((c) => c.id === cityId);
  if (!city) throw new GameError({ en: "That city isn't yours.", es: "Esa ciudad no es tuya." });
  return city;
}

export const capitalOf = (p: PlayerState) => p.cities.find((c) => c.isCapital) ?? p.cities[0];

// ---------------------------------------------------------------------------
// Formulas
// ---------------------------------------------------------------------------

const grow = (base: number, factor: number, steps: number) => Math.round(base * Math.pow(factor, steps));

export function buildingCost(p: PlayerState, city: CityState, type: BuildingType, level: number): ResourceBag {
  const def = BUILDINGS[type];
  const cost = emptyBag();
  cost.wood = grow(def.wood[0], def.wood[1], level - 1);
  if (def.marble && level >= def.marble[2]) cost.marble = grow(def.marble[0], def.marble[1], level - def.marble[2]);
  if (def.crystal && level >= def.crystal[2]) cost.crystal = grow(def.crystal[0], def.crystal[1], level - def.crystal[2]);

  const woodCut = Math.min(0.5, buildingLevel(city, "carpenter") * 0.02 + (hasTech(p, "pulley") ? 0.1 : 0));
  const marbleCut = hasTech(p, "geometry") ? 0.1 : 0;
  cost.wood = Math.round(cost.wood * (1 - woodCut));
  cost.marble = Math.round(cost.marble * (1 - marbleCut));
  return cost;
}

export function buildingSeconds(p: PlayerState, type: BuildingType, level: number, speed: number): number {
  const def = BUILDINGS[type];
  const base = def.time[0] * Math.pow(def.time[1], level - 1);
  const cut = hasTech(p, "architecture") ? 0.9 : 1;
  return Math.max(5, Math.round((base * cut) / speed));
}

export function housing(city: CityState): number {
  const l = buildingLevel(city, "town_hall");
  if (l === 0) return 20;
  return Math.round(60 + 50 * (l - 1) + 5 * (l - 1) ** 2);
}

export function storageCap(p: PlayerState, city: CityState): number {
  const raw = BALANCE.baseStorage + BALANCE.storagePerWarehouseLevel * sumLevels(city, "warehouse");
  return Math.round(raw * (hasTech(p, "conservation") ? 1.2 : 1));
}

export function safeAmount(city: CityState): number {
  return BALANCE.safeBase + BALANCE.safePerWarehouseLevel * sumLevels(city, "warehouse");
}

export const ISLAND_MAX_LEVEL = 30;
/** wood the island community must donate to go from `level` to `level + 1` */
export function islandUpgradeCost(kind: "sawmill" | "mine", level: number): number {
  return kind === "sawmill" ? Math.round(350 * Math.pow(1.6, level - 1)) : Math.round(550 * Math.pow(1.65, level - 1));
}

export const maxWoodWorkers = (sawmillLevel: number) => 30 + 20 * (sawmillLevel - 1);
export const maxLuxWorkers = (mineLevel: number) => 20 + 14 * (mineLevel - 1);
export const maxScientists = (city: CityState) => {
  const l = buildingLevel(city, "academy");
  return l === 0 ? 0 : 8 + 6 * (l - 1);
};
export const maxShips = (city: CityState) => {
  const l = sumLevels(city, "port");
  return l === 0 ? 0 : 2 + 3 * l;
};

export function shipPrice(p: PlayerState, totalShips: number): number {
  const base = BALANCE.baseShipPrice * Math.pow(BALANCE.shipPriceFactor, totalShips);
  return Math.round(base * (hasTech(p, "shipbuilding") ? 0.85 : 1));
}

/** wine per hour (speed 1) a tavern burns when serving `level` */
export function wineUse(p: PlayerState, level: number): number {
  if (level <= 0) return 0;
  const raw = 4 * level * (1 + 0.08 * (level - 1));
  return raw * (hasTech(p, "wine_culture") ? 0.8 : 1);
}

export function happiness(city: CityState, wineFraction = 1): number {
  return (
    BALANCE.baseHappiness +
    (city.isCapital ? BALANCE.capitalHappiness : 0) +
    BALANCE.tavernHappinessPerLevel * buildingLevel(city, "tavern") +
    BALANCE.winePerServedLevel * city.wineLevel * wineFraction +
    BALANCE.museumHappinessPerLevel * buildingLevel(city, "museum")
  );
}

export function researchMultiplier(p: PlayerState): number {
  return 1 + (hasTech(p, "wisdom") ? 0.1 : 0) + (hasTech(p, "paper") ? 0.15 : 0);
}

export function freeCitizens(city: CityState): number {
  return Math.max(0, Math.floor(city.population) - city.woodWorkers - city.luxWorkers - city.scientists);
}

export function unitUpkeep(units: UnitBag): number {
  return UNIT_TYPES.reduce((sum, u) => sum + (units[u] ?? 0) * UNITS[u].upkeep, 0);
}

export function trainingUpkeep(city: CityState): number {
  return city.training.reduce((sum, b) => sum + b.count * UNITS[b.unit].upkeep, 0);
}

export function luxuryMultiplier(city: CityState): number {
  return 1 + 0.03 * buildingLevel(city, "stonemason");
}

export interface CityRates {
  /** all values per hour, already multiplied by game speed */
  wood: number;
  luxury: number;
  luxuryResource: LuxuryResource;
  wineUse: number;
  research: number;
  goldIncome: number;
  goldUpkeep: number;
  happiness: number;
  netHappiness: number;
  growth: number;
  housing: number;
  storage: number;
  safe: number;
  freeCitizens: number;
  maxWoodWorkers: number;
  maxLuxWorkers: number;
  maxScientists: number;
  maxShips: number;
}

export function cityRates(p: PlayerState, city: CityState, speed: number): CityRates {
  const free = freeCitizens(city);
  const h = happiness(city);
  const hous = housing(city);
  const lux = city.island.resource;
  const luxury = city.luxWorkers * BALANCE.luxuryPerWorker * luxuryMultiplier(city) * speed;
  const wineBurn = wineUse(p, city.wineLevel) * speed;
  const growth = city.population >= hous && h > city.population ? 0 : (h - city.population) * BALANCE.growthFactor * speed;
  return {
    wood: city.woodWorkers * BALANCE.woodPerWorker * speed,
    luxury,
    luxuryResource: lux,
    wineUse: wineBurn,
    research: city.scientists * BALANCE.researchPerScientist * researchMultiplier(p) * speed,
    goldIncome: free * BALANCE.goldPerCitizen * speed,
    goldUpkeep: (city.scientists * BALANCE.scientistUpkeep + unitUpkeep(city.units) + trainingUpkeep(city)) * speed,
    happiness: Math.round(h),
    netHappiness: Math.round(h - city.population),
    growth,
    housing: hous,
    storage: storageCap(p, city),
    safe: safeAmount(city),
    freeCitizens: free,
    maxWoodWorkers: maxWoodWorkers(city.island.sawmillLevel),
    maxLuxWorkers: hasTech(p, "wealth") ? maxLuxWorkers(city.island.mineLevel) : 0,
    maxScientists: maxScientists(city),
    maxShips: maxShips(city),
  };
}

// ---------------------------------------------------------------------------
// Time advance
// ---------------------------------------------------------------------------

function nextEventAfter(p: PlayerState, t: number): number {
  let next = Infinity;
  for (const c of p.cities) {
    if (c.construction && c.construction.endsAt > t) next = Math.min(next, c.construction.endsAt);
    for (const b of c.training) if (b.endsAt > t) next = Math.min(next, b.endsAt);
  }
  return next;
}

function completeEvents(p: PlayerState, t: number) {
  for (const c of p.cities) {
    const k = c.construction;
    if (k && k.endsAt <= t) {
      const existing = c.buildings.find((b) => b.slot === k.slot);
      if (existing) existing.level = k.targetLevel;
      else c.buildings.push({ slot: k.slot, type: k.type, level: k.targetLevel });
      c.construction = null;
    }
    const done = c.training.filter((b) => b.endsAt <= t);
    for (const b of done) c.units[b.unit] = (c.units[b.unit] ?? 0) + b.count;
    if (done.length) c.training = c.training.filter((b) => b.endsAt > t);
  }
}

function integrate(p: PlayerState, dtMs: number, speed: number) {
  const hours = dtMs / 3_600_000;
  let gold = 0;
  let research = 0;

  for (const c of p.cities) {
    const cap = storageCap(p, c);

    // Wine first: the tavern only makes people happy while there is wine.
    const wineNeeded = wineUse(p, c.wineLevel) * speed * hours;
    let wineFraction = 1;
    if (wineNeeded > 0) {
      if (c.res.wine >= wineNeeded) c.res.wine -= wineNeeded;
      else {
        wineFraction = c.res.wine / wineNeeded;
        c.res.wine = 0;
      }
    }

    const free = freeCitizens(c);
    gold += (free * BALANCE.goldPerCitizen - c.scientists * BALANCE.scientistUpkeep - unitUpkeep(c.units) - trainingUpkeep(c)) * speed * hours;
    research += c.scientists * BALANCE.researchPerScientist * researchMultiplier(p) * speed * hours;

    c.res.wood = Math.min(cap, c.res.wood + c.woodWorkers * BALANCE.woodPerWorker * speed * hours);
    const lux = c.island.resource;
    const luxGain = c.luxWorkers * BALANCE.luxuryPerWorker * luxuryMultiplier(c) * speed * hours;
    c.res[lux] = Math.min(cap, Math.max(c.res[lux], 0) + luxGain);

    // Population converges exponentially toward happiness, capped by housing.
    const h = happiness(c, wineFraction);
    const k = BALANCE.growthFactor * speed * hours;
    const hous = housing(c);
    let pop = h - (h - c.population) * Math.exp(-k);
    if (pop > c.population) pop = c.population >= hous ? c.population : Math.min(pop, hous);
    c.population = Math.max(0, pop);

    // If citizens shrink below assigned jobs, release scientists first, then miners, then loggers.
    let excess = c.woodWorkers + c.luxWorkers + c.scientists - Math.floor(c.population);
    if (excess > 0) {
      const cut = (n: number) => {
        const r = Math.min(n, excess);
        excess -= r;
        return n - r;
      };
      c.scientists = cut(c.scientists);
      c.luxWorkers = cut(c.luxWorkers);
      c.woodWorkers = cut(c.woodWorkers);
    }
  }

  gold -= p.awayUpkeep * speed * hours;
  p.gold = Math.max(0, p.gold + gold);
  p.research += research;
}

/** Advance the whole account to `to` (epoch ms). Mutates and returns `p`. */
export function advance(p: PlayerState, to: number, speed: number): PlayerState {
  let t = p.lastTick;
  completeEvents(p, t);
  while (t < to) {
    const next = Math.min(to, t + MAX_STEP_MS, nextEventAfter(p, t));
    integrate(p, next - t, speed);
    t = next;
    completeEvents(p, t);
  }
  p.lastTick = Math.max(p.lastTick, to);
  return p;
}

// ---------------------------------------------------------------------------
// Commands (pure; throw GameError on invalid input)
// ---------------------------------------------------------------------------

function pay(city: CityState, cost: Partial<ResourceBag>) {
  for (const r of RESOURCES) {
    const need = cost[r] ?? 0;
    if (need > 0 && city.res[r] + 1e-6 < need) {
      const missing = Math.ceil(need - city.res[r]);
      throw new GameError({
        en: `You need ${enNum(missing)} more ${resourceLabel(r, "en").toLowerCase()}.`,
        es: `${missing === 1 ? "Te falta" : "Te faltan"} ${esNum(missing)} de ${RESOURCE_LABEL[r]}.`,
      });
    }
  }
  for (const r of RESOURCES) city.res[r] = Math.max(0, city.res[r] - (cost[r] ?? 0));
}

const RESOURCE_LABEL: Record<Resource, string> = {
  wood: "madera",
  wine: "vino",
  marble: "mármol",
  crystal: "cristal",
  sulfur: "azufre",
};

const needsTech = (tech: TechId): Text => ({
  en: `Research ${techName(tech, "en")} first.`,
  es: `Necesitás investigar ${techName(tech, "es")}.`,
});

const needsBuilding = (type: BuildingType, level: number): Text => ({
  en: `You need ${buildingName(type, "en")} level ${level}.`,
  es: `Necesitás ${buildingName(type, "es")} nivel ${level}.`,
});

/** Why `type` can't go on `slot` right now, in every language; null when it can. */
export function buildBlocker(p: PlayerState, city: CityState, slot: number, type: BuildingType): Text | null {
  const def = BUILDINGS[type];
  const slotDef = CITY_SLOTS.find((s) => s.slot === slot);
  if (!slotDef) return { en: "That plot doesn't exist.", es: "Ese lugar no existe." };
  if (slotDef.kind !== def.slotKind) return { en: "That building doesn't go here.", es: "Ese edificio no va en este lugar." };
  if (def.unique && city.buildings.some((b) => b.type === type)) {
    return { en: "You already have this building in this city.", es: "Ya tenés este edificio en la ciudad." };
  }
  const req = def.requires;
  if (req?.capitalOnly && !city.isCapital) return { en: "Only your capital can build this.", es: "Solo se construye en la capital." };
  if (req?.tech && !hasTech(p, req.tech)) return needsTech(req.tech);
  if (req?.building && buildingLevel(city, req.building[0]) < req.building[1]) return needsBuilding(req.building[0], req.building[1]);
  return null;
}

/** buildBlocker in one language (Spanish unless told otherwise, as before). */
export function canBuildType(p: PlayerState, city: CityState, slot: number, type: BuildingType, lang: Locale = "es"): string | null {
  return buildBlocker(p, city, slot, type)?.[lang] ?? null;
}

export function startConstruction(p: PlayerState, cityId: string, slot: number, type: BuildingType | null, now: number, speed: number) {
  const city = getCity(p, cityId);
  if (city.construction) throw new GameError({ en: "This city is already building something.", es: "Ya hay una obra en marcha en esta ciudad." });
  const existing = city.buildings.find((b) => b.slot === slot);
  let buildType: BuildingType;
  let level: number;
  if (existing) {
    buildType = existing.type;
    level = existing.level + 1;
    if (level > BUILDINGS[buildType].maxLevel) throw new GameError({ en: "This building is already at max level.", es: "Este edificio ya está al máximo." });
  } else {
    if (!type) throw new GameError({ en: "Choose what to build.", es: "Elegí qué construir." });
    const why = buildBlocker(p, city, slot, type);
    if (why) throw new GameError(why);
    buildType = type;
    level = 1;
  }
  const cost = buildingCost(p, city, buildType, level);
  pay(city, cost);
  const seconds = buildingSeconds(p, buildType, level, speed);
  city.construction = { slot, type: buildType, targetLevel: level, startedAt: now, endsAt: now + seconds * 1000, cost };
  return city.construction;
}

export function cancelConstruction(p: PlayerState, cityId: string) {
  const city = getCity(p, cityId);
  const k = city.construction;
  if (!k) throw new GameError({ en: "There's no construction to cancel.", es: "No hay ninguna obra para cancelar." });
  const cap = storageCap(p, city);
  for (const r of RESOURCES) city.res[r] = Math.min(cap, city.res[r] + k.cost[r]);
  city.construction = null;
}

export function ambrosiaToFinish(now: number, endsAt: number): number {
  const minutes = Math.max(0, endsAt - now) / 60_000;
  return Math.max(1, Math.ceil(minutes * BALANCE.ambrosiaPerMinute));
}

/** What néctar can finish: the building work, the Barracks queue or the Port's shipyard queue. */
export type FinishTarget = "construction" | "training" | "shipyard";
const yardOf = (what: Exclude<FinishTarget, "construction">): Yard => (what === "training" ? "barracks" : "port");

/** When the last batch queued at `yard` is done (0 when its queue is empty). */
export function yardQueueEnd(city: CityState, yard: Yard): number {
  return city.training.reduce((m, b) => (unitYard(b.unit) === yard ? Math.max(m, b.endsAt) : m), 0);
}

/** When `what` is done, if anything is running. */
export function finishTargetEnd(city: CityState, what: FinishTarget): number | undefined {
  return (what === "construction" ? city.construction?.endsAt : yardQueueEnd(city, yardOf(what))) || undefined;
}

export function finishWithAmbrosia(p: PlayerState, cityId: string, what: FinishTarget, now: number) {
  const city = getCity(p, cityId);
  const endsAt = finishTargetEnd(city, what);
  if (!endsAt || endsAt <= now) throw new GameError({ en: "There's nothing to finish.", es: "No hay nada para terminar." });
  const price = ambrosiaToFinish(now, endsAt);
  if (p.ambrosia < price) throw new GameError(needsNectar(price));
  p.ambrosia -= price;
  if (what === "construction" && city.construction) city.construction.endsAt = now;
  else if (what !== "construction") {
    const yard = yardOf(what);
    for (const b of city.training) if (unitYard(b.unit) === yard) b.endsAt = Math.min(b.endsAt, now);
  }
  completeEvents(p, now);
  return price;
}

export function setWorkers(
  p: PlayerState,
  cityId: string,
  next: { woodWorkers?: number; luxWorkers?: number; scientists?: number },
) {
  const city = getCity(p, cityId);
  const wood = next.woodWorkers ?? city.woodWorkers;
  const lux = next.luxWorkers ?? city.luxWorkers;
  const sci = next.scientists ?? city.scientists;
  if ([wood, lux, sci].some((n) => !Number.isInteger(n) || n < 0)) throw new GameError(INVALID_AMOUNT);
  if (wood > maxWoodWorkers(city.island.sawmillLevel)) {
    throw new GameError({ en: "The sawmill doesn't have room for that many.", es: "El aserradero no tiene lugar para tantos." });
  }
  if (lux > 0 && !hasTech(p, "wealth")) {
    throw new GameError({ en: `Research ${techName("wealth", "en")} to work the mine.`, es: "Investigá Riqueza para trabajar la mina." });
  }
  if (lux > maxLuxWorkers(city.island.mineLevel)) {
    throw new GameError({ en: "The mine doesn't have room for that many.", es: "La mina no tiene lugar para tantos." });
  }
  if (sci > maxScientists(city)) {
    throw new GameError({ en: "The Academy doesn't have room for that many.", es: "La academia no tiene lugar para tantos." });
  }
  if (wood + lux + sci > Math.floor(city.population)) {
    throw new GameError({ en: "You don't have enough citizens.", es: "No te alcanzan los ciudadanos." });
  }
  city.woodWorkers = wood;
  city.luxWorkers = lux;
  city.scientists = sci;
}

export function setWineLevel(p: PlayerState, cityId: string, level: number) {
  const city = getCity(p, cityId);
  const max = buildingLevel(city, "tavern");
  if (!Number.isInteger(level) || level < 0 || level > max) {
    throw new GameError({ en: "Your Tavern can't serve that much.", es: "La taberna no da para tanto." });
  }
  city.wineLevel = level;
}

/** Why `unit` can't be trained (or, for warships, built) in this city yet, in every language; null when it can. */
export function trainBlocker(p: PlayerState, city: CityState, unit: UnitType): Text | null {
  const def = UNITS[unit];
  const [yard, level] = yardRequirement(unit);
  if (buildingLevel(city, yard) < level) return needsBuilding(yard, level);
  if (def.requires.tech && !hasTech(p, def.requires.tech)) return needsTech(def.requires.tech);
  return null;
}

/** What one unit costs this player: Shipbuilding makes warships 15% cheaper, like merchant ships. */
export function unitCost(p: PlayerState, unit: UnitType): Partial<ResourceBag> {
  const def = UNITS[unit];
  const cut = isNaval(unit) && hasTech(p, "shipbuilding") ? 0.85 : 1;
  const cost: Partial<ResourceBag> = {};
  for (const r of RESOURCES) if (def.cost[r]) cost[r] = Math.round(def.cost[r]! * cut);
  return cost;
}

/** Each level of the yard (Barracks or Port) works 2% faster, up to 40%. */
export const yardSpeedCut = (level: number) => Math.min(0.4, level * 0.02);

/** Seconds one unit takes in this city: Drill speeds up troops, each yard level speeds up its own units. */
export function unitSeconds(p: PlayerState, city: CityState, unit: UnitType, speed: number): number {
  const yard = unitYard(unit);
  const drill = yard === "barracks" && hasTech(p, "drill") ? 0.9 : 1;
  return ((UNITS[unit].time * drill) / speed) * (1 - yardSpeedCut(buildingLevel(city, yard)));
}

/** trainBlocker in one language (Spanish unless told otherwise, as before). */
export function canTrain(p: PlayerState, city: CityState, unit: UnitType, lang: Locale = "es"): string | null {
  return trainBlocker(p, city, unit)?.[lang] ?? null;
}

export function trainUnits(p: PlayerState, cityId: string, unit: UnitType, count: number, now: number, speed: number, id: string) {
  const city = getCity(p, cityId);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new GameError(INVALID_AMOUNT);
  const why = trainBlocker(p, city, unit);
  if (why) throw new GameError(why);
  if (freeCitizens(city) < count) throw new GameError({ en: "Not enough idle citizens.", es: "No hay suficientes ciudadanos libres." });
  const each = unitCost(p, unit);
  const cost: Partial<ResourceBag> = {};
  for (const r of RESOURCES) if (each[r]) cost[r] = each[r]! * count;
  pay(city, cost);
  city.population -= count; // troops and ship crews both come from idle citizens
  const seconds = Math.max(3, Math.round(unitSeconds(p, city, unit, speed) * count));
  // The Barracks and the Port's shipyard each keep their own queue.
  const start = Math.max(now, yardQueueEnd(city, unitYard(unit)));
  const batch: TrainingBatch = { id, unit, count, startedAt: start, endsAt: start + seconds * 1000 };
  city.training.push(batch);
  return batch;
}

export function buyShip(p: PlayerState, cityId: string, totalShipsOwned: number, shipsInCity: number) {
  const city = getCity(p, cityId);
  const cap = maxShips(city);
  if (cap === 0) throw new GameError({ en: "Build a Port to buy ships.", es: "Construí un Puerto para comprar barcos." });
  if (shipsInCity >= cap) {
    throw new GameError({ en: "Your Port has no free berths. Upgrade it.", es: "El puerto no tiene más amarras. Subilo de nivel." });
  }
  const price = shipPrice(p, totalShipsOwned);
  if (p.gold < price) throw new GameError(needsGold(price));
  p.gold -= price;
  city.ships += 1;
  return price;
}

export function research(p: PlayerState, tech: TechId) {
  const def = TECHS[tech];
  if (!def) throw new GameError({ en: "That research doesn't exist.", es: "Esa investigación no existe." });
  if (hasTech(p, tech)) throw new GameError({ en: "You've already researched that.", es: "Ya la investigaste." });
  if (def.requires && !hasTech(p, def.requires)) {
    throw new GameError({ en: `Research ${techName(def.requires, "en")} first.`, es: `Primero investigá ${techName(def.requires, "es")}.` });
  }
  if (p.research + 1e-6 < def.cost) throw new GameError({ en: "Not enough research points.", es: "Te faltan puntos de investigación." });
  p.research -= def.cost;
  p.techs = [...p.techs, tech];
}

export function merchantTrade(p: PlayerState, cityId: string, resource: Resource) {
  const city = getCity(p, cityId);
  if (p.ambrosia < BALANCE.merchantAmbrosia) throw new GameError(needsNectar(BALANCE.merchantAmbrosia));
  const cap = storageCap(p, city);
  if (city.res[resource] >= cap) throw new GameError({ en: "Your Warehouse is already full of that.", es: "El depósito ya está lleno de eso." });
  p.ambrosia -= BALANCE.merchantAmbrosia;
  city.res[resource] = Math.min(cap, city.res[resource] + BALANCE.merchantAmount);
}

/** Shared with founding a colony (src/server/commands.ts). */
export const CITY_NAME_LENGTH: Text = { en: "City names must be 3 to 24 characters long.", es: "El nombre tiene que tener entre 3 y 24 letras." };

export function renameCity(p: PlayerState, cityId: string, name: string) {
  const city = getCity(p, cityId);
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 3 || clean.length > 24) throw new GameError(CITY_NAME_LENGTH);
  city.name = clean;
}

// ---------------------------------------------------------------------------
// Missions & combat helpers
// ---------------------------------------------------------------------------

export function islandDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function travelSeconds(p: PlayerState, from: { x: number; y: number }, to: { x: number; y: number }, speed: number) {
  const d = islandDistance(from, to);
  const base = d === 0 ? BALANCE.travelSameIsland : BALANCE.travelPerDistance * d;
  return Math.max(10, Math.round((base * (hasTech(p, "cartography") ? 0.75 : 1)) / speed));
}

export const shipsForCargo = (total: number) => Math.ceil(total / BALANCE.shipCapacity);
export const shipsForUnits = (units: number) => Math.max(1, Math.ceil(units / BALANCE.unitsPerShip));
export const countUnits = (u: UnitBag) => UNIT_TYPES.reduce((s, t) => s + (u[t] ?? 0), 0);

function pickUnits(units: UnitBag, naval: boolean): UnitBag {
  const out: UnitBag = {};
  for (const t of UNIT_TYPES) if (isNaval(t) === naval && (units[t] ?? 0) > 0) out[t] = units[t];
  return out;
}
/** Soldiers and siege engines (they need merchant ships to cross the sea). */
export const landUnits = (units: UnitBag) => pickUnits(units, false);
/** Warships (they sail on their own). */
export const navalUnits = (units: UnitBag) => pickUnits(units, true);
export const countLand = (units: UnitBag) => countUnits(landUnits(units));
export const countNaval = (units: UnitBag) => countUnits(navalUnits(units));
/** Merchant ships an army needs: only land troops ride them, warships sail alone. */
export function transportShipsFor(units: UnitBag): number {
  const land = countLand(units);
  return land > 0 ? shipsForUnits(land) : 0;
}

function mergeUnits(...bags: (UnitBag | undefined)[]): UnitBag {
  const out: UnitBag = {};
  for (const bag of bags) for (const t of UNIT_TYPES) if (bag?.[t]) out[t] = (out[t] ?? 0) + bag[t]!;
  return out;
}

export function takeUnits(city: CityState, units: UnitBag) {
  for (const t of UNIT_TYPES) {
    const n = units[t] ?? 0;
    if (!Number.isInteger(n) || n < 0) throw new GameError(INVALID_AMOUNT);
    if (n > (city.units[t] ?? 0)) throw new GameError({ en: "You don't have that many troops in this city.", es: "No tenés tantas tropas en esta ciudad." });
  }
  for (const t of UNIT_TYPES) {
    const n = units[t] ?? 0;
    if (n) city.units[t] = (city.units[t] ?? 0) - n;
  }
}

export function addUnits(city: CityState, units: UnitBag) {
  for (const t of UNIT_TYPES) if (units[t]) city.units[t] = (city.units[t] ?? 0) + units[t]!;
}

export function takeCargo(city: CityState, cargo: Partial<ResourceBag>) {
  pay(city, cargo);
}

export function addCargo(p: PlayerState, city: CityState, cargo: Partial<ResourceBag>) {
  const cap = storageCap(p, city);
  for (const r of RESOURCES) if (cargo[r]) city.res[r] = Math.min(cap, city.res[r] + cargo[r]!);
}

export function barbarianArmy(level: number): { units: UnitBag; wall: number } {
  return {
    units: { spearman: 8 * level, slinger: 4 * level, swordsman: level >= 5 ? 2 * level : 0 },
    wall: Math.floor(level / 3),
  };
}

export function barbarianLoot(level: number): ResourceBag {
  return { wood: 300 * level, wine: 100 * level, marble: 100 * level, crystal: 60 * level, sulfur: 60 * level };
}

export interface CombatResult {
  attackerWins: boolean;
  attackPower: number;
  defensePower: number;
  attackerLosses: UnitBag;
  defenderLosses: UnitBag;
  attackerSurvivors: UnitBag;
  defenderSurvivors: UnitBag;
  effectiveWall: number;
}

function applyLoss(units: UnitBag, fraction: number) {
  const losses: UnitBag = {};
  const survivors: UnitBag = {};
  for (const t of UNIT_TYPES) {
    const n = units[t] ?? 0;
    if (!n) continue;
    const lost = Math.min(n, Math.round(n * fraction));
    if (lost) losses[t] = lost;
    if (n - lost) survivors[t] = n - lost;
  }
  return { losses, survivors };
}

export function resolveCombat(attacker: UnitBag, defender: UnitBag, wallLevel: number): CombatResult {
  const catapults = attacker.catapult ?? 0;
  const effectiveWall = Math.max(0, wallLevel - Math.floor(catapults / 2));
  const attackPower = UNIT_TYPES.reduce((s, t) => s + (attacker[t] ?? 0) * UNITS[t].attack, 0);
  const defenders = UNIT_TYPES.reduce((s, t) => s + (defender[t] ?? 0) * UNITS[t].defense, 0);
  // An empty city still has its wall and some angry citizens.
  const defensePower = (defenders + effectiveWall * 15) * (1 + 0.1 * effectiveWall);

  const attackerWins = attackPower > defensePower;
  const winner = Math.max(attackPower, defensePower);
  const loser = Math.min(attackPower, defensePower);
  const ratio = winner === 0 ? 0 : loser / winner;
  const winnerLoss = 0.5 * Math.pow(ratio, 1.5);
  const loserLoss = Math.min(1, 0.5 + 0.5 * (1 - ratio));

  const a = applyLoss(attacker, attackerWins ? winnerLoss : loserLoss);
  const d = applyLoss(defender, attackerWins ? loserLoss : winnerLoss);
  return {
    attackerWins,
    attackPower: Math.round(attackPower),
    defensePower: Math.round(defensePower),
    attackerLosses: a.losses,
    defenderLosses: d.losses,
    attackerSurvivors: a.survivors,
    defenderSurvivors: d.survivors,
    effectiveWall,
  };
}

export interface AssaultResult {
  /** Warship against warship. Fought only when the defender has warships docked. */
  sea: CombatResult | null;
  /** The defender's fleet held: nobody landed and the attackers sail home. */
  turnedBack: boolean;
  /** The battle at the walls, or null when turned back at sea. */
  land: CombatResult | null;
  /** Landed and won on land. */
  attackerWins: boolean;
  attackerLosses: UnitBag;
  defenderLosses: UnitBag;
  attackerSurvivors: UnitBag;
  defenderSurvivors: UnitBag;
}

/**
 * A full attack on a coastal target. If the defender has warships docked, the fleets fight first
 * (no wall at sea). Lose at sea and the landing is turned back: troops on the transports never
 * fight. Win at sea, or meet no fleet, and the land battle runs as always, with the wall; the
 * warships that are still afloat on either side join it.
 */
export function resolveAssault(attacker: UnitBag, defender: UnitBag, wallLevel: number): AssaultResult {
  let attackerShips = navalUnits(attacker);
  let defenderShips = navalUnits(defender);
  let sea: CombatResult | null = null;
  if (countUnits(defenderShips) > 0) {
    sea = resolveCombat(attackerShips, defenderShips, 0);
    attackerShips = sea.attackerSurvivors;
    defenderShips = sea.defenderSurvivors;
    if (!sea.attackerWins) {
      return {
        sea,
        turnedBack: true,
        land: null,
        attackerWins: false,
        attackerLosses: sea.attackerLosses,
        defenderLosses: sea.defenderLosses,
        attackerSurvivors: mergeUnits(landUnits(attacker), attackerShips),
        defenderSurvivors: mergeUnits(landUnits(defender), defenderShips),
      };
    }
  }
  const land = resolveCombat(mergeUnits(landUnits(attacker), attackerShips), mergeUnits(landUnits(defender), defenderShips), wallLevel);
  return {
    sea,
    turnedBack: false,
    land,
    attackerWins: land.attackerWins,
    attackerLosses: mergeUnits(sea?.attackerLosses, land.attackerLosses),
    defenderLosses: mergeUnits(sea?.defenderLosses, land.defenderLosses),
    attackerSurvivors: land.attackerSurvivors,
    defenderSurvivors: land.defenderSurvivors,
  };
}

/** Split `capacity` across lootable resources proportionally. */
export function computeLoot(available: Partial<ResourceBag>, capacity: number): ResourceBag {
  const loot = emptyBag();
  const total = RESOURCES.reduce((s, r) => s + Math.max(0, Math.floor(available[r] ?? 0)), 0);
  if (total <= 0 || capacity <= 0) return loot;
  const ratio = Math.min(1, capacity / total);
  for (const r of RESOURCES) loot[r] = Math.floor(Math.max(0, Math.floor(available[r] ?? 0)) * ratio);
  return loot;
}

export function lootableFrom(city: CityState): ResourceBag {
  const safe = safeAmount(city);
  const out = emptyBag();
  for (const r of RESOURCES) out[r] = Math.max(0, Math.floor(city.res[r] - safe));
  return out;
}

export function militaryPower(units: UnitBag) {
  return UNIT_TYPES.reduce((s, t) => s + (units[t] ?? 0) * (UNITS[t].attack + UNITS[t].defense), 0);
}

export function cityScore(city: CityState) {
  return city.buildings.reduce((s, b) => s + b.level * 10, 0) + Math.floor(city.population);
}

// ---------------------------------------------------------------------------
// Advisor: one clear next step for new players
// ---------------------------------------------------------------------------

export interface AdvisorHint {
  title: Text;
  body: Text;
  href: string;
}

export function advisorHint(p: PlayerState, city: CityState, speed: number): AdvisorHint | null {
  const island = `/isla/${city.islandId}`;
  const cityHref = `/ciudad/${city.id}`;
  const freeSlot = CITY_SLOTS.find((s) => s.kind === "land" && !city.buildings.some((b) => b.slot === s.slot))?.slot ?? 1;
  const rates = cityRates(p, city, speed);
  const building = city.construction?.type;
  // Suggest building X only when nothing is under construction (one obra at a time).
  const canSuggest = (type: BuildingType) => !city.construction && building !== type;
  if (city.woodWorkers === 0) {
    return { title: { en: "Chop some wood", es: "Poné gente a talar" }, body: { en: "No wood, no buildings. Send citizens to the island sawmill.", es: "Sin madera no hay obras. Mandá ciudadanos al aserradero de la isla." }, href: `${island}?panel=sawmill` };
  }
  if (canSuggest("academy") && buildingLevel(city, "academy") === 0) {
    return { title: { en: "Build an Academy", es: "Levantá una Academia" }, body: { en: "Scientists unlock upgrades for your whole polis.", es: "Los científicos destraban mejoras para toda tu polis." }, href: `${cityHref}?slot=${freeSlot}` };
  }
  if (buildingLevel(city, "academy") > 0 && city.scientists === 0 && rates.freeCitizens > 4) {
    const academy = city.buildings.find((b) => b.type === "academy")!;
    return { title: { en: "Seat your scientists", es: "Sentá científicos" }, body: { en: "Assign citizens to the Academy to earn research.", es: "Asigná ciudadanos a la Academia para sumar investigación." }, href: `${cityHref}?slot=${academy.slot}` };
  }
  if (canSuggest("warehouse") && sumLevels(city, "warehouse") === 0) {
    return { title: { en: "Build a Warehouse", es: "Hacé un Depósito" }, body: { en: "More room to store, less for raiders to take.", es: "Más lugar para guardar y menos para que te saqueen." }, href: `${cityHref}?slot=${freeSlot}` };
  }
  if (p.techs.length === 0 && p.research >= 30) {
    return { title: { en: "Research your first upgrade", es: "Investigá tu primera mejora" }, body: { en: "You have enough points for Conservation.", es: "Ya tenés puntos para Conservación." }, href: "/investigacion" };
  }
  if (canSuggest("town_hall") && buildingLevel(city, "town_hall") < 2) {
    return { title: { en: "Upgrade the Town Hall", es: "Ampliá la Intendencia" }, body: { en: "More housing, more citizens, more gold.", es: "Más viviendas, más ciudadanos, más oro." }, href: `${cityHref}?slot=0` };
  }
  if (canSuggest("tavern") && buildingLevel(city, "tavern") === 0 && buildingLevel(city, "town_hall") >= 2) {
    return { title: { en: "Open a Tavern", es: "Abrí una Taberna" }, body: { en: "With wine flowing, your people grow faster.", es: "Con vino el pueblo crece más rápido." }, href: `${cityHref}?slot=${freeSlot}` };
  }
  if (canSuggest("barracks") && buildingLevel(city, "barracks") === 0 && buildingLevel(city, "town_hall") >= 2) {
    return { title: { en: "Build Barracks", es: "Construí un Cuartel" }, body: { en: "The island's barbarians are sitting on loot.", es: "Los bárbaros de la isla guardan un botín." }, href: `${cityHref}?slot=${freeSlot}` };
  }
  if (canSuggest("port") && sumLevels(city, "port") === 0) {
    return { title: { en: "Build a Port", es: "Hacé un Puerto" }, body: { en: "No ships, no leaving the island.", es: "Sin barcos no salís de la isla." }, href: `${cityHref}?slot=12` };
  }
  if (p.ambrosia === 0 && !building) {
    return { title: { en: "Try Nectar", es: "Probá el néctar" }, body: { en: "Bought with test SOL, it finishes any building instantly.", es: "Se compra con SOL de prueba y termina cualquier obra al instante." }, href: "/tesoro" };
  }
  return null;
}
