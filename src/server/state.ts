import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { Db, Tx } from "@/db";
import { cities, islands, missions, players } from "@/db/schema";
import { unitUpkeep, type CityState, type IslandInfo, type PlayerState } from "@/game/engine";

type Executor = Db | Tx;

export function toIslandInfo(row: typeof islands.$inferSelect): IslandInfo {
  return {
    id: row.id,
    name: row.name,
    x: row.x,
    y: row.y,
    resource: row.resource,
    sawmillLevel: row.sawmillLevel,
    mineLevel: row.mineLevel,
  };
}

export async function loadPlayer(ex: Executor, playerId: string, opts: { lock?: boolean } = {}): Promise<PlayerState | null> {
  const query = ex.select().from(players).where(eq(players.id, playerId));
  const [row] = opts.lock ? await query.for("update") : await query;
  if (!row) return null;

  const cityRows = await ex
    .select()
    .from(cities)
    .where(eq(cities.playerId, playerId))
    .orderBy(desc(cities.isCapital), asc(cities.createdAt));
  const islandIds = [...new Set(cityRows.map((c) => c.islandId))];
  const islandRows = islandIds.length ? await ex.select().from(islands).where(inArray(islands.id, islandIds)) : [];
  const islandById = new Map(islandRows.map((i) => [i.id, toIslandInfo(i)]));
  const active = await ex
    .select({ units: missions.units })
    .from(missions)
    .where(and(eq(missions.playerId, playerId), ne(missions.status, "done")));

  const cityStates: CityState[] = cityRows.map((c) => ({
    id: c.id,
    name: c.name,
    isCapital: c.isCapital,
    islandId: c.islandId,
    slot: c.slot,
    island: islandById.get(c.islandId)!,
    res: { wood: c.wood, wine: c.wine, marble: c.marble, crystal: c.crystal, sulfur: c.sulfur },
    population: c.population,
    woodWorkers: c.woodWorkers,
    luxWorkers: c.luxWorkers,
    scientists: c.scientists,
    wineLevel: c.wineLevel,
    ships: c.ships,
    buildings: c.buildings,
    units: c.units,
    construction: c.construction ?? null,
    training: c.training,
  }));

  return {
    id: row.id,
    name: row.name,
    wallet: row.wallet,
    gold: row.gold,
    research: row.research,
    ambrosia: row.ambrosia,
    techs: row.techs,
    lastTick: row.lastTick.getTime(),
    awayUpkeep: active.reduce((s, m) => s + unitUpkeep(m.units), 0),
    cities: cityStates,
  };
}

export async function savePlayer(tx: Tx, p: PlayerState) {
  await tx
    .update(players)
    .set({
      name: p.name,
      gold: p.gold,
      research: p.research,
      ambrosia: p.ambrosia,
      techs: p.techs,
      lastTick: new Date(p.lastTick),
    })
    .where(eq(players.id, p.id));

  for (const c of p.cities) {
    await tx
      .update(cities)
      .set({
        name: c.name,
        wood: c.res.wood,
        wine: c.res.wine,
        marble: c.res.marble,
        crystal: c.res.crystal,
        sulfur: c.res.sulfur,
        population: c.population,
        woodWorkers: c.woodWorkers,
        luxWorkers: c.luxWorkers,
        scientists: c.scientists,
        wineLevel: c.wineLevel,
        ships: c.ships,
        buildings: c.buildings,
        units: c.units,
        construction: c.construction,
        training: c.training,
      })
      .where(eq(cities.id, c.id));
  }
}
