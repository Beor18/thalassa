import "server-only";
import { cacheLife } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cities, islands, players } from "@/db/schema";
import type { BuildingType, LuxuryResource } from "@/game/data";
import { referralCode } from "./referral-code";

/** Names are looked up per language where they're shown (buildingName in @/game/names). */
export interface PublicBuilding {
  type: BuildingType;
  level: number;
}

/** What anyone can see about a polis without logging in. Nothing strategic: no resources, no army. */
export interface PublicCity {
  id: string;
  name: string;
  isCapital: boolean;
  ownerName: string;
  /** owner's invite code: the page's call to action credits them */
  ownerCode: string;
  islandName: string;
  resource: LuxuryResource;
  score: number;
  buildingCount: number;
  topBuildings: PublicBuilding[];
  foundedAt: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public view of a polis, cached for a few minutes so shared links cost almost nothing. */
export async function getPublicCity(id: string): Promise<PublicCity | null> {
  "use cache";
  cacheLife("minutes");
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select({
      id: cities.id,
      name: cities.name,
      isCapital: cities.isCapital,
      population: cities.population,
      buildings: cities.buildings,
      construction: cities.construction,
      createdAt: cities.createdAt,
      playerId: players.id,
      ownerName: players.name,
      islandName: islands.name,
      resource: islands.resource,
    })
    .from(cities)
    .innerJoin(players, eq(players.id, cities.playerId))
    .innerJoin(islands, eq(islands.id, cities.islandId))
    .where(eq(cities.id, id));
  if (!row) return null;

  // Stored state lags until the owner plays again: count an upgrade that already finished.
  const buildings = row.buildings.map((b) => ({ ...b }));
  const c = row.construction;
  if (c && c.endsAt <= Date.now()) {
    const existing = buildings.find((b) => b.slot === c.slot);
    if (existing) existing.level = Math.max(existing.level, c.targetLevel);
    else buildings.push({ slot: c.slot, type: c.type, level: c.targetLevel });
  }

  const score = buildings.reduce((s, b) => s + b.level * 10, 0) + Math.floor(row.population);
  return {
    id: row.id,
    name: row.name,
    isCapital: row.isCapital,
    ownerName: row.ownerName,
    ownerCode: referralCode(row.playerId),
    islandName: row.islandName,
    resource: row.resource,
    score,
    buildingCount: buildings.length,
    topBuildings: [...buildings]
      .sort((a, b) => b.level - a.level || a.slot - b.slot)
      .slice(0, 4)
      .map((b) => ({ type: b.type, level: b.level })),
    foundedAt: row.createdAt.getTime(),
  };
}
