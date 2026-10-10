import "server-only";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ambrosiaLedger, cities, islands, missions, players } from "@/db/schema";
import { BALANCE, ISLAND_PLOTS, RESOURCES, type BuildingType, type Resource, type ResourceBag, type TechId, type UnitBag, type UnitType } from "@/game/data";
import {
  GameError,
  ISLAND_MAX_LEVEL,
  advance,
  buildingLevel,
  buyShip,
  cancelConstruction,
  capitalOf,
  countUnits,
  finishWithAmbrosia,
  freeCitizens,
  getCity,
  hasTech,
  islandUpgradeCost,
  merchantTrade,
  renameCity,
  research,
  setWineLevel,
  setWorkers,
  shipsForCargo,
  shipsForUnits,
  startConstruction,
  takeCargo,
  takeUnits,
  trainUnits,
  travelSeconds,
  type PlayerState,
} from "@/game/engine";
import { GAME_SPEED } from "./config";
import { processDueMissions } from "./missions";
import { readCitizenAmbrosia } from "./solana";
import { loadPlayer, savePlayer, toIslandInfo } from "./state";

interface Ctx {
  tx: Tx;
  now: number;
}

/** Load the account under a row lock, advance it to now, run `fn`, persist. */
export async function withPlayer<T>(playerId: string, fn: (p: PlayerState, ctx: Ctx) => Promise<T> | T): Promise<T> {
  await processDueMissions();
  return db.transaction(async (tx) => {
    const p = await loadPlayer(tx, playerId, { lock: true });
    if (!p) throw new GameError("Tu cuenta no existe. Volvé a entrar.");
    const now = Date.now();
    advance(p, now, GAME_SPEED);
    const result = await fn(p, { tx, now });
    await savePlayer(tx, p);
    return result;
  });
}

export const build = (playerId: string, cityId: string, slot: number, type: BuildingType | null) =>
  withPlayer(playerId, (p, { now }) => startConstruction(p, cityId, slot, type, now, GAME_SPEED));

export const cancelBuild = (playerId: string, cityId: string) => withPlayer(playerId, (p) => cancelConstruction(p, cityId));

export const finishNow = (playerId: string, cityId: string, what: "construction" | "training") =>
  withPlayer(playerId, async (p, { tx, now }) => {
    const price = finishWithAmbrosia(p, cityId, what, now);
    await tx.insert(ambrosiaLedger).values({ playerId, delta: -price, reason: `finish:${what}` });
    return price;
  });

export const assignWorkers = (playerId: string, cityId: string, next: { woodWorkers?: number; luxWorkers?: number; scientists?: number }) =>
  withPlayer(playerId, (p) => setWorkers(p, cityId, next));

export const serveWine = (playerId: string, cityId: string, level: number) => withPlayer(playerId, (p) => setWineLevel(p, cityId, level));

export const train = (playerId: string, cityId: string, unit: UnitType, amount: number) =>
  withPlayer(playerId, (p, { now }) => trainUnits(p, cityId, unit, amount, now, GAME_SPEED, crypto.randomUUID()));

async function shipsAtSea(tx: Tx, playerId: string) {
  const [row] = await tx
    .select({ n: sql<number>`coalesce(sum(${missions.ships}), 0)::int` })
    .from(missions)
    .where(and(eq(missions.playerId, playerId), ne(missions.status, "done")));
  return row?.n ?? 0;
}

export const purchaseShip = (playerId: string, cityId: string) =>
  withPlayer(playerId, async (p, { tx }) => {
    const city = getCity(p, cityId);
    const total = p.cities.reduce((s, c) => s + c.ships, 0) + (await shipsAtSea(tx, playerId));
    return buyShip(p, cityId, total, city.ships);
  });

export const doResearch = (playerId: string, tech: TechId) => withPlayer(playerId, (p) => research(p, tech));

export const tradeAmbrosia = (playerId: string, cityId: string, resource: Resource) =>
  withPlayer(playerId, async (p, { tx }) => {
    merchantTrade(p, cityId, resource);
    await tx.insert(ambrosiaLedger).values({ playerId, delta: -BALANCE.merchantAmbrosia, reason: `merchant:${resource}` });
  });

export const rename = (playerId: string, cityId: string, name: string) => withPlayer(playerId, (p) => renameCity(p, cityId, name));

export async function renamePlayer(playerId: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 3 || clean.length > 20) throw new GameError("Tu nombre tiene que tener entre 3 y 20 letras.");
  await db.update(players).set({ name: clean }).where(eq(players.id, playerId));
}

export const donate = (playerId: string, cityId: string, target: "sawmill" | "mine", amount: number) =>
  withPlayer(playerId, async (p, { tx }) => {
    if (!Number.isInteger(amount) || amount < 1) throw new GameError("Cantidad inválida.");
    const city = getCity(p, cityId);
    if (city.res.wood + 1e-6 < amount) throw new GameError("No tenés tanta madera.");
    const [island] = await tx.select().from(islands).where(eq(islands.id, city.islandId)).for("update");
    let level = target === "sawmill" ? island.sawmillLevel : island.mineLevel;
    let pool = (target === "sawmill" ? island.sawmillDonated : island.mineDonated) + amount;
    if (level >= ISLAND_MAX_LEVEL) throw new GameError("Ya está al máximo.");
    city.res.wood -= amount;
    while (level < ISLAND_MAX_LEVEL && pool >= islandUpgradeCost(target, level)) {
      pool -= islandUpgradeCost(target, level);
      level += 1;
    }
    await tx
      .update(islands)
      .set(target === "sawmill" ? { sawmillLevel: level, sawmillDonated: pool } : { mineLevel: level, mineDonated: pool })
      .where(eq(islands.id, island.id));
    return { level };
  });

function cleanCargo(cargo: Partial<ResourceBag>) {
  const out: Partial<ResourceBag> = {};
  for (const r of RESOURCES) {
    const n = Math.floor(cargo[r] ?? 0);
    if (n < 0) throw new GameError("Cantidad inválida.");
    if (n > 0) out[r] = n;
  }
  return out;
}

async function islandOf(tx: Tx, islandId: number) {
  const [row] = await tx.select().from(islands).where(eq(islands.id, islandId));
  if (!row) throw new GameError("Esa isla no existe.");
  return toIslandInfo(row);
}

export const sendTransport = (playerId: string, originCityId: string, targetCityId: string, cargo: Partial<ResourceBag>) =>
  withPlayer(playerId, async (p, { tx, now }) => {
    const origin = getCity(p, originCityId);
    if (originCityId === targetCityId) throw new GameError("Elegí otra ciudad de destino.");
    const [target] = await tx.select().from(cities).where(eq(cities.id, targetCityId));
    if (!target) throw new GameError("Esa ciudad no existe.");
    const clean = cleanCargo(cargo);
    const total = Object.values(clean).reduce((s, n) => s + (n ?? 0), 0);
    if (total <= 0) throw new GameError("Cargá algo en los barcos.");
    const ships = shipsForCargo(total);
    if (ships > origin.ships) throw new GameError(`Necesitás ${ships} barcos en el puerto.`);
    takeCargo(origin, clean);
    origin.ships -= ships;
    const seconds = travelSeconds(p, origin.island, await islandOf(tx, target.islandId), GAME_SPEED);
    const [m] = await tx
      .insert(missions)
      .values({
        playerId,
        kind: "transport",
        status: "outbound",
        originCityId,
        targetCityId,
        targetIslandId: target.islandId,
        ships,
        cargo: clean,
        departsAt: new Date(now),
        arrivesAt: new Date(now + seconds * 1000),
      })
      .returning({ id: missions.id, arrivesAt: missions.arrivesAt, ships: missions.ships });
    return m;
  });

export type AttackTarget = { cityId: string } | { barbariansOnIsland: number };

export const sendAttack = (playerId: string, originCityId: string, target: AttackTarget, units: UnitBag) =>
  withPlayer(playerId, async (p, { tx, now }) => {
    const origin = getCity(p, originCityId);
    const n = countUnits(units);
    if (n <= 0) throw new GameError("Elegí tropas para mandar.");
    const ships = shipsForUnits(n);
    if (ships > origin.ships) throw new GameError(`Necesitás ${ships} barcos en el puerto para llevar ${n} soldados.`);

    let targetIslandId: number;
    let targetCityId: string | null = null;
    if ("cityId" in target) {
      const [row] = await tx.select().from(cities).where(eq(cities.id, target.cityId));
      if (!row) throw new GameError("Esa ciudad no existe.");
      if (row.playerId === playerId) throw new GameError("No podés atacar tus propias ciudades.");
      const [owner] = await tx.select({ createdAt: players.createdAt }).from(players).where(eq(players.id, row.playerId));
      const protectedUntil = owner.createdAt.getTime() + (BALANCE.newbieProtectionHours * 3_600_000) / GAME_SPEED;
      if (protectedUntil > now) throw new GameError("Esa polis recién se fundó y está bajo protección. Probá más tarde.");
      targetIslandId = row.islandId;
      targetCityId = row.id;
    } else {
      targetIslandId = target.barbariansOnIsland;
    }
    takeUnits(origin, units);
    origin.ships -= ships;
    const seconds = travelSeconds(p, origin.island, await islandOf(tx, targetIslandId), GAME_SPEED);
    const [m] = await tx
      .insert(missions)
      .values({
        playerId,
        kind: "attack",
        status: "outbound",
        originCityId,
        targetCityId,
        targetIslandId,
        ships,
        units,
        departsAt: new Date(now),
        arrivesAt: new Date(now + seconds * 1000),
      })
      .returning({ id: missions.id, arrivesAt: missions.arrivesAt, ships: missions.ships });
    return m;
  });

export const sendColonists = (playerId: string, originCityId: string, islandId: number, slot: number, name: string) =>
  withPlayer(playerId, async (p, { tx, now }) => {
    if (!hasTech(p, "expansion")) throw new GameError("Investigá Expansión para fundar colonias.");
    const origin = getCity(p, originCityId);
    const palace = buildingLevel(capitalOf(p), "palace");
    const [pending] = await tx
      .select({ n: count() })
      .from(missions)
      .where(and(eq(missions.playerId, playerId), eq(missions.kind, "colonize"), eq(missions.status, "outbound")));
    if (p.cities.length - 1 + pending.n >= palace) throw new GameError("Subí el Palacio de la capital para tener otra colonia.");
    if (!Number.isInteger(slot) || slot < 0 || slot >= ISLAND_PLOTS) throw new GameError("Ese lugar no existe.");
    const [taken] = await tx
      .select({ id: cities.id })
      .from(cities)
      .where(and(eq(cities.islandId, islandId), eq(cities.slot, slot)));
    if (taken) throw new GameError("Ese lugar ya tiene dueño.");
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 3 || clean.length > 24) throw new GameError("El nombre tiene que tener entre 3 y 24 letras.");
    const c = BALANCE.colonizeCost;
    if (origin.ships < 1) throw new GameError("Necesitás un barco en el puerto.");
    if (freeCitizens(origin) < c.citizens) throw new GameError(`Necesitás ${c.citizens} ciudadanos libres.`);
    if (p.gold < c.gold) throw new GameError(`Necesitás ${c.gold} de oro.`);
    takeCargo(origin, { wood: c.wood });
    p.gold -= c.gold;
    origin.population -= c.citizens;
    origin.ships -= 1;
    const seconds = travelSeconds(p, origin.island, await islandOf(tx, islandId), GAME_SPEED);
    const [m] = await tx
      .insert(missions)
      .values({
        playerId,
        kind: "colonize",
        status: "outbound",
        originCityId,
        targetIslandId: islandId,
        targetSlot: slot,
        colonyName: clean,
        ships: 1,
        departsAt: new Date(now),
        arrivesAt: new Date(now + seconds * 1000),
      })
      .returning({ id: missions.id, arrivesAt: missions.arrivesAt, ships: missions.ships });
    return m;
  });

/** Credit ambrosia bought on-chain since the last sync. Idempotent. */
export async function syncAmbrosia(playerId: string) {
  const [row] = await db.select({ wallet: players.wallet }).from(players).where(eq(players.id, playerId));
  if (!row) throw new GameError("Tu cuenta no existe.");
  const onchain = await readCitizenAmbrosia(row.wallet);
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.id, playerId)).for("update");
    const delta = onchain - p.ambrosiaSynced;
    if (delta <= 0) return { credited: 0, total: p.ambrosia, onchain };
    await tx
      .update(players)
      .set({ ambrosia: p.ambrosia + delta, ambrosiaSynced: onchain })
      .where(eq(players.id, playerId));
    await tx.insert(ambrosiaLedger).values({ playerId, delta, reason: "onchain:buy_ambrosia", ref: `total:${onchain}` });
    return { credited: delta, total: p.ambrosia + delta, onchain };
  });
}
