import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePlayerId } from "./auth";
import { getSnapshot, type GameSnapshot } from "./queries";

export const CITY_COOKIE = "thalassa_city";

export type GameCity = GameSnapshot["cities"][number];
export interface Game {
  snapshot: GameSnapshot;
  city: GameCity;
}

/**
 * Everything a game page needs: verified player, fresh snapshot and the city in focus.
 * `cityId` (from the URL) wins over the remembered city cookie; falls back to the capital.
 * Must be called inside a <Suspense> boundary (reads cookies and the database).
 */
export const getGame = cache(async (cityId?: string): Promise<Game> => {
  const playerId = await requirePlayerId();
  const remembered = (await cookies()).get(CITY_COOKIE)?.value;
  const snapshot = await getSnapshot(playerId, cityId ?? remembered);
  if (!snapshot || snapshot.cities.length === 0) redirect("/salir");
  const city =
    snapshot.cities.find((c) => c.id === cityId) ??
    snapshot.cities.find((c) => c.id === remembered) ??
    snapshot.cities[0];
  return { snapshot, city };
});
