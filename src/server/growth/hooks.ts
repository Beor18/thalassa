import "server-only";
import { buildingLevel, type PlayerState } from "@/game/engine";
import { trackActiveDay } from "./analytics";
import { REFERRAL_TOWN_HALL, settleReferral } from "./referrals";

/**
 * Runs every time a player's snapshot is read (any game page). Cheap and never throws:
 * marks the player active today and, once their Intendencia reached the referral level,
 * pays the invite reward. Returns néctar (ambrosia) credited to this player right now (0 almost always).
 */
export async function onPlayerSeen(p: PlayerState): Promise<number> {
  await trackActiveDay(p.id);
  const townHall = p.cities.reduce((max, c) => Math.max(max, buildingLevel(c, "town_hall")), 0);
  if (townHall < REFERRAL_TOWN_HALL) return 0;
  return settleReferral(p.id);
}
