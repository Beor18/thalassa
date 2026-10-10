import "server-only";
import { and, eq, lte, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { cities, islands, missions, players, reports } from "@/db/schema";
import { BALANCE, emptyBag, type UnitBag } from "@/game/data";
import {
  addCargo,
  addUnits,
  advance,
  barbarianArmy,
  barbarianLoot,
  buildingLevel,
  computeLoot,
  countUnits,
  lootableFrom,
  resolveCombat,
  type PlayerState,
} from "@/game/engine";
import { GAME_SPEED } from "./config";
import { loadPlayer, savePlayer } from "./state";

type MissionRow = typeof missions.$inferSelect;

const dueFilter = (now: Date) =>
  or(
    and(eq(missions.status, "outbound"), lte(missions.arrivesAt, now)),
    and(eq(missions.status, "returning"), lte(missions.returnsAt, now)),
  );

/**
 * Resolve every mission event (arrival or return) that is due, in time order.
 * Runs at the start of each request; a transaction-scoped advisory lock keeps
 * concurrent requests from resolving the same battle twice.
 */
export async function processDueMissions(nowMs = Date.now()) {
  const now = new Date(nowMs);
  const [any] = await db.select({ id: missions.id }).from(missions).where(dueFilter(now)).limit(1);
  if (!any) return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
    for (let i = 0; i < 500; i++) {
      const due = await tx.select().from(missions).where(dueFilter(now));
      if (!due.length) break;
      const eventTime = (m: MissionRow) => (m.status === "outbound" ? m.arrivesAt : m.returnsAt!).getTime();
      due.sort((a, b) => eventTime(a) - eventTime(b));
      const m = due[0];
      if (m.status === "outbound") await handleArrival(tx, m, eventTime(m));
      else await handleReturn(tx, m, eventTime(m));
    }
  });
}

async function loadAdvanced(tx: Tx, playerId: string, t: number) {
  const p = await loadPlayer(tx, playerId, { lock: true });
  if (p) advance(p, t, GAME_SPEED);
  return p;
}

async function startReturn(tx: Tx, m: MissionRow, t: number, patch: Partial<MissionRow> = {}) {
  const travel = m.arrivesAt.getTime() - m.departsAt.getTime();
  await tx
    .update(missions)
    .set({ status: "returning", returnsAt: new Date(t + travel), ...patch })
    .where(eq(missions.id, m.id));
}

async function report(tx: Tx, playerId: string, kind: "battle" | "transport" | "colony" | "system", title: string, body: Record<string, unknown>, at: number) {
  await tx.insert(reports).values({ playerId, kind, title, body, createdAt: new Date(at) });
}

async function handleReturn(tx: Tx, m: MissionRow, t: number) {
  const owner = await loadAdvanced(tx, m.playerId, t);
  const origin = owner?.cities.find((c) => c.id === m.originCityId);
  if (owner && origin) {
    origin.ships += m.ships;
    addUnits(origin, m.units);
    addCargo(owner, origin, m.cargo);
    await savePlayer(tx, owner);
  }
  await tx.update(missions).set({ status: "done" }).where(eq(missions.id, m.id));
}

async function handleArrival(tx: Tx, m: MissionRow, t: number) {
  if (m.kind === "transport") return arriveTransport(tx, m, t);
  if (m.kind === "attack") return m.targetCityId ? arriveAttackCity(tx, m, t) : arriveAttackBarbarians(tx, m, t);
  return arriveColonize(tx, m, t);
}

async function cityLabel(tx: Tx, cityId: string) {
  const [row] = await tx
    .select({ name: cities.name, playerName: players.name, islandName: islands.name })
    .from(cities)
    .innerJoin(players, eq(players.id, cities.playerId))
    .innerJoin(islands, eq(islands.id, cities.islandId))
    .where(eq(cities.id, cityId));
  return row ?? { name: "Ciudad perdida", playerName: "?", islandName: "?" };
}

async function arriveTransport(tx: Tx, m: MissionRow, t: number) {
  const [target] = m.targetCityId ? await tx.select({ playerId: cities.playerId }).from(cities).where(eq(cities.id, m.targetCityId)) : [];
  const from = await cityLabel(tx, m.originCityId);
  if (!target) {
    // Destination vanished: bring the cargo back home.
    await startReturn(tx, m, t);
    return;
  }
  const receiver = await loadAdvanced(tx, target.playerId, t);
  const city = receiver?.cities.find((c) => c.id === m.targetCityId);
  if (receiver && city) {
    addCargo(receiver, city, m.cargo);
    await savePlayer(tx, receiver);
  }
  const to = await cityLabel(tx, m.targetCityId!);
  const body = { from, to, cargo: m.cargo };
  await report(tx, m.playerId, "transport", `Tus barcos llegaron a ${to.name}`, body, t);
  if (target.playerId !== m.playerId) await report(tx, target.playerId, "transport", `${from.playerName} te mandó recursos`, body, t);
  await startReturn(tx, m, t, { cargo: {} });
}

async function arriveAttackCity(tx: Tx, m: MissionRow, t: number) {
  const [target] = await tx.select({ playerId: cities.playerId }).from(cities).where(eq(cities.id, m.targetCityId!));
  if (!target) {
    await startReturn(tx, m, t);
    return;
  }
  const attackerLabel = await cityLabel(tx, m.originCityId);
  const defender = await loadAdvanced(tx, target.playerId, t);
  const city = defender?.cities.find((c) => c.id === m.targetCityId);
  if (!defender || !city) {
    await startReturn(tx, m, t);
    return;
  }
  const defenderUnits: UnitBag = { ...city.units };
  const wall = buildingLevel(city, "wall");
  const result = resolveCombat(m.units, defenderUnits, wall);
  city.units = result.defenderSurvivors;

  let loot = emptyBag();
  if (result.attackerWins && countUnits(result.attackerSurvivors) > 0) {
    loot = computeLoot(lootableFrom(city), m.ships * BALANCE.shipCapacity);
    for (const r of Object.keys(loot) as (keyof typeof loot)[]) city.res[r] -= loot[r];
  }
  await savePlayer(tx, defender);

  const body = {
    target: { kind: "city", name: city.name, islandName: city.island.name, playerName: defender.name },
    attacker: { name: attackerLabel.playerName, city: attackerLabel.name, units: m.units, losses: result.attackerLosses },
    defender: { name: defender.name, units: defenderUnits, losses: result.defenderLosses, wall, effectiveWall: result.effectiveWall },
    attackPower: result.attackPower,
    defensePower: result.defensePower,
    attackerWins: result.attackerWins,
    loot,
  };
  await report(tx, m.playerId, "battle", result.attackerWins ? `Victoria en ${city.name}` : `Derrota en ${city.name}`, { ...body, role: "attacker" }, t);
  await report(tx, defender.id, "battle", result.attackerWins ? `${attackerLabel.playerName} saqueó ${city.name}` : `Rechazaste a ${attackerLabel.playerName}`, { ...body, role: "defender" }, t);
  await startReturn(tx, m, t, { units: result.attackerSurvivors, cargo: loot });
}

async function arriveAttackBarbarians(tx: Tx, m: MissionRow, t: number) {
  const [island] = await tx.select().from(islands).where(eq(islands.id, m.targetIslandId)).for("update");
  const cooldownMs = (BALANCE.barbarianCooldown * 1000) / GAME_SPEED;
  const rebuilding = island.barbarianDefeatedAt && island.barbarianDefeatedAt.getTime() + cooldownMs > t;
  const attackerLabel = await cityLabel(tx, m.originCityId);
  if (rebuilding) {
    await report(tx, m.playerId, "battle", `El campamento de ${island.name} estaba vacío`, {
      target: { kind: "barbarians", name: "Campamento bárbaro", islandName: island.name, level: island.barbarianLevel },
      empty: true,
      role: "attacker",
    }, t);
    await startReturn(tx, m, t);
    return;
  }
  const army = barbarianArmy(island.barbarianLevel);
  const result = resolveCombat(m.units, army.units, army.wall);
  let loot = emptyBag();
  if (result.attackerWins && countUnits(result.attackerSurvivors) > 0) {
    loot = computeLoot(barbarianLoot(island.barbarianLevel), m.ships * BALANCE.shipCapacity);
    await tx
      .update(islands)
      .set({ barbarianLevel: Math.min(30, island.barbarianLevel + 1), barbarianDefeatedAt: new Date(t) })
      .where(eq(islands.id, island.id));
  }
  await report(
    tx,
    m.playerId,
    "battle",
    result.attackerWins ? `Arrasaste el campamento de ${island.name}` : `Los bárbaros de ${island.name} resistieron`,
    {
      role: "attacker",
      target: { kind: "barbarians", name: "Campamento bárbaro", islandName: island.name, level: island.barbarianLevel },
      attacker: { name: attackerLabel.playerName, city: attackerLabel.name, units: m.units, losses: result.attackerLosses },
      defender: { name: "Bárbaros", units: army.units, losses: result.defenderLosses, wall: army.wall, effectiveWall: result.effectiveWall },
      attackPower: result.attackPower,
      defensePower: result.defensePower,
      attackerWins: result.attackerWins,
      loot,
    },
    t,
  );
  await startReturn(tx, m, t, { units: result.attackerSurvivors, cargo: loot });
}

async function arriveColonize(tx: Tx, m: MissionRow, t: number) {
  const [island] = await tx.select().from(islands).where(eq(islands.id, m.targetIslandId)).for("update");
  const taken = await tx.select({ slot: cities.slot }).from(cities).where(eq(cities.islandId, island.id));
  const takenSet = new Set(taken.map((c) => c.slot));
  let slot = m.targetSlot ?? -1;
  if (slot < 0 || takenSet.has(slot)) {
    slot = Array.from({ length: 8 }, (_, i) => i).find((s) => !takenSet.has(s)) ?? -1;
  }
  const owner: PlayerState | null = await loadAdvanced(tx, m.playerId, t);
  if (slot < 0 || !owner) {
    // Island full: refund the colonists' gold and wood.
    if (owner) {
      owner.gold += BALANCE.colonizeCost.gold;
      const origin = owner.cities.find((c) => c.id === m.originCityId);
      if (origin) {
        origin.population += BALANCE.colonizeCost.citizens;
        addCargo(owner, origin, { wood: BALANCE.colonizeCost.wood });
      }
      await savePlayer(tx, owner);
    }
    await report(tx, m.playerId, "colony", `No quedaba lugar en ${island.name}`, { islandName: island.name, ok: false }, t);
    await startReturn(tx, m, t);
    return;
  }
  // Persist the owner at `t` so the new colony starts producing from its founding moment.
  await savePlayer(tx, owner);
  const [created] = await tx
    .insert(cities)
    .values({
      playerId: m.playerId,
      islandId: island.id,
      slot,
      name: m.colonyName ?? `Colonia de ${island.name}`,
      isCapital: false,
      wood: 300,
      wine: 0,
      marble: 100,
      crystal: 0,
      sulfur: 0,
      population: BALANCE.colonizeCost.citizens,
      buildings: [{ slot: 0, type: "town_hall", level: 1 }],
      units: {},
      training: [],
      createdAt: new Date(t),
    })
    .returning({ id: cities.id, name: cities.name });
  await report(tx, m.playerId, "colony", `Fundaste ${created.name}`, { islandName: island.name, cityName: created.name, cityId: created.id, ok: true }, t);
  await startReturn(tx, m, t);
}
