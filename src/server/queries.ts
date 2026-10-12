import "server-only";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cities, islands, missions, players, reports } from "@/db/schema";
import type { UnitBag } from "@/game/data";
import {
  advance,
  advisorHint,
  buildingLevel,
  cityRates,
  cityScore,
  islandUpgradeCost,
  militaryPower,
  type AdvisorHint,
  type CityRates,
  type CityState,
  type PlayerState,
} from "@/game/engine";
import { DEFAULT_LOCALE, type Locale, type Text } from "@/i18n/config";
import { GAME_SPEED } from "./config";
import { onPlayerSeen } from "./growth/hooks";
import { processDueMissions } from "./missions";
import { loadPlayer } from "./state";

export interface MissionView {
  id: string;
  kind: "transport" | "attack" | "colonize";
  status: "outbound" | "returning";
  originCityId: string;
  originName: string;
  /** Where the fleet is headed, in the snapshot's language (the page's, via getGame). */
  targetLabel: string;
  /** Where the fleet is headed, in every language: "Nueva Atenas on Naxos", "Barbarians on Paros", a city name. */
  targetText: Text;
  targetIslandId: number;
  ships: number;
  units: UnitBag;
  cargo: Record<string, number>;
  departsAt: number;
  arrivesAt: number;
  returnsAt: number | null;
}

export interface GameSnapshot {
  now: number;
  speed: number;
  player: Omit<PlayerState, "cities">;
  cities: (CityState & { rates: CityRates })[];
  missions: MissionView[];
  unreadReports: number;
  advisor: AdvisorHint | null;
}

/** Fresh, side-effect-free view of an account at this instant. `lang` picks the language of text labels. */
export async function getSnapshot(playerId: string, focusCityId?: string, lang: Locale = DEFAULT_LOCALE): Promise<GameSnapshot | null> {
  await processDueMissions();
  const p = await loadPlayer(db, playerId);
  if (!p) return null;
  const now = Date.now();
  advance(p, now, GAME_SPEED);
  p.ambrosia += await onPlayerSeen(p); // growth hook: active day + referral reward (never throws)

  const missionRows = await db
    .select()
    .from(missions)
    .where(and(eq(missions.playerId, playerId), ne(missions.status, "done")))
    .orderBy(asc(missions.arrivesAt));
  const cityIds = [...new Set(missionRows.flatMap((m) => [m.originCityId, m.targetCityId].filter(Boolean) as string[]))];
  const names = cityIds.length
    ? await db.select({ id: cities.id, name: cities.name }).from(cities).where(inArray(cities.id, cityIds))
    : [];
  const islandIds = [...new Set(missionRows.map((m) => m.targetIslandId))];
  const islandNames = islandIds.length
    ? await db.select({ id: islands.id, name: islands.name }).from(islands).where(inArray(islands.id, islandIds))
    : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const islandOf = new Map(islandNames.map((n) => [n.id, n.name]));

  const [{ n: unread }] = await db
    .select({ n: count() })
    .from(reports)
    .where(and(eq(reports.playerId, playerId), eq(reports.read, false)));

  const focus = p.cities.find((c) => c.id === focusCityId) ?? p.cities[0];
  const { cities: cityStates, ...player } = p;
  return {
    now,
    speed: GAME_SPEED,
    player,
    cities: cityStates.map((c) => ({ ...c, rates: cityRates(p, c, GAME_SPEED) })),
    missions: missionRows.map((m) => {
      const targetText = missionTarget(m, nameOf, islandOf);
      return {
        id: m.id,
        kind: m.kind,
        status: m.status as "outbound" | "returning",
        originCityId: m.originCityId,
        originName: nameOf.get(m.originCityId) ?? "?",
        targetLabel: targetText[lang],
        targetText,
        targetIslandId: m.targetIslandId,
        ships: m.ships,
        units: m.units,
        cargo: m.cargo as Record<string, number>,
        departsAt: m.departsAt.getTime(),
        arrivesAt: m.arrivesAt.getTime(),
        returnsAt: m.returnsAt?.getTime() ?? null,
      };
    }),
    unreadReports: unread,
    advisor: focus ? advisorHint(p, focus, GAME_SPEED) : null,
  };
}

function missionTarget(
  m: { kind: string; colonyName: string | null; targetCityId: string | null; targetIslandId: number },
  nameOf: Map<string, string>,
  islandOf: Map<number, string>,
): Text {
  const island = islandOf.get(m.targetIslandId);
  if (m.kind === "colonize") return { en: `${m.colonyName} on ${island}`, es: `${m.colonyName} en ${island}` };
  if (m.targetCityId) {
    const name = nameOf.get(m.targetCityId) ?? "?";
    return { en: name, es: name };
  }
  return { en: `Barbarians on ${island}`, es: `Bárbaros de ${island}` };
}

export interface IslandCityView {
  id: string;
  slot: number;
  name: string;
  playerId: string;
  playerName: string;
  townHall: number;
  wall: number;
  isMine: boolean;
}

export interface IslandView {
  id: number;
  name: string;
  x: number;
  y: number;
  resource: "wine" | "marble" | "crystal" | "sulfur";
  sawmill: { level: number; donated: number; nextCost: number };
  mine: { level: number; donated: number; nextCost: number };
  barbarians: { level: number; rebuildingUntil: number | null };
  cities: IslandCityView[];
}

export async function getIsland(islandId: number, playerId: string): Promise<IslandView | null> {
  await processDueMissions();
  const [island] = await db.select().from(islands).where(eq(islands.id, islandId));
  if (!island) return null;
  const rows = await db
    .select({
      id: cities.id,
      slot: cities.slot,
      name: cities.name,
      playerId: cities.playerId,
      playerName: players.name,
      buildings: cities.buildings,
    })
    .from(cities)
    .innerJoin(players, eq(players.id, cities.playerId))
    .where(eq(cities.islandId, islandId))
    .orderBy(asc(cities.slot));
  const cooldownMs = (4 * 3600 * 1000) / GAME_SPEED;
  const until = island.barbarianDefeatedAt ? island.barbarianDefeatedAt.getTime() + cooldownMs : null;
  const level = (b: { type: string; level: number }[], t: string) => b.find((x) => x.type === t)?.level ?? 0;
  return {
    id: island.id,
    name: island.name,
    x: island.x,
    y: island.y,
    resource: island.resource,
    sawmill: { level: island.sawmillLevel, donated: Math.floor(island.sawmillDonated), nextCost: islandUpgradeCost("sawmill", island.sawmillLevel) },
    mine: { level: island.mineLevel, donated: Math.floor(island.mineDonated), nextCost: islandUpgradeCost("mine", island.mineLevel) },
    barbarians: { level: island.barbarianLevel, rebuildingUntil: until && until > Date.now() ? until : null },
    cities: rows.map((r) => ({
      id: r.id,
      slot: r.slot,
      name: r.name,
      playerId: r.playerId,
      playerName: r.playerName,
      townHall: level(r.buildings, "town_hall"),
      wall: level(r.buildings, "wall"),
      isMine: r.playerId === playerId,
    })),
  };
}

export interface WorldIsland {
  id: number;
  name: string;
  x: number;
  y: number;
  resource: "wine" | "marble" | "crystal" | "sulfur";
  variant: number;
  cityCount: number;
  mine: boolean;
}

export async function getWorld(playerId: string): Promise<WorldIsland[]> {
  const rows = await db
    .select({
      id: islands.id,
      name: islands.name,
      x: islands.x,
      y: islands.y,
      resource: islands.resource,
      variant: islands.variant,
      cityCount: sql<number>`count(${cities.id})::int`,
      mine: sql<boolean>`coalesce(bool_or(${cities.playerId} = ${playerId}), false)`,
    })
    .from(islands)
    .leftJoin(cities, eq(cities.islandId, islands.id))
    .groupBy(islands.id)
    .orderBy(asc(islands.id));
  return rows;
}

export async function getReports(playerId: string, limit = 50) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.playerId, playerId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export async function markReportsRead(playerId: string) {
  await db.update(reports).set({ read: true }).where(and(eq(reports.playerId, playerId), eq(reports.read, false)));
}

export interface RankingRow {
  playerId: string;
  name: string;
  cities: number;
  buildings: number;
  military: number;
  research: number;
  score: number;
}

export async function getRanking(): Promise<RankingRow[]> {
  const ps = await db.select({ id: players.id, name: players.name, techs: players.techs }).from(players);
  const cs = await db
    .select({ playerId: cities.playerId, buildings: cities.buildings, units: cities.units, population: cities.population })
    .from(cities);
  const rows = ps.map((p) => {
    const mine = cs.filter((c) => c.playerId === p.id);
    const buildings = mine.reduce(
      (s, c) => s + cityScore({ buildings: c.buildings, population: c.population } as unknown as CityState),
      0,
    );
    const military = mine.reduce((s, c) => s + militaryPower(c.units), 0);
    const researchScore = p.techs.length * 40;
    return {
      playerId: p.id,
      name: p.name,
      cities: mine.length,
      buildings,
      military,
      research: researchScore,
      score: buildings + Math.round(military / 4) + researchScore,
    };
  });
  return rows.sort((a, b) => b.score - a.score);
}

/** When the account was created (ms), for the profile. */
export async function getPlayerJoinedAt(playerId: string): Promise<number | null> {
  const [row] = await db.select({ createdAt: players.createdAt }).from(players).where(eq(players.id, playerId));
  return row ? row.createdAt.getTime() : null;
}

/** Cities the player can pick as a destination for transports (own ones + everyone on known islands). */
export async function getDestinations(playerId: string) {
  return db
    .select({
      id: cities.id,
      name: cities.name,
      islandId: cities.islandId,
      islandName: islands.name,
      playerName: players.name,
      isMine: sql<boolean>`${cities.playerId} = ${playerId}`,
    })
    .from(cities)
    .innerJoin(players, eq(players.id, cities.playerId))
    .innerJoin(islands, eq(islands.id, cities.islandId))
    .orderBy(desc(sql`${cities.playerId} = ${playerId}`), asc(islands.name), asc(cities.name));
}

export { buildingLevel };
