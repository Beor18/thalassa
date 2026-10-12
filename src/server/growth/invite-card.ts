import "server-only";
import { cacheLife } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cities } from "@/db/schema";
import { getPublicCity, type PublicCity } from "./public-city";
import { findReferrer } from "./referrals";

export interface InviteCard {
  inviterName: string;
  /** the inviter's capital, shown on the card; null before they found one */
  city: PublicCity | null;
}

/** Who is behind an invite code, for the link preview and its image. Cached: chats re-fetch previews often. */
export async function getInviteCard(code: string): Promise<InviteCard | null> {
  "use cache";
  cacheLife("minutes");
  const referrer = await findReferrer(code);
  if (!referrer) return null;
  const [capital] = await db
    .select({ id: cities.id })
    .from(cities)
    .where(and(eq(cities.playerId, referrer.id), eq(cities.isCapital, true)))
    .orderBy(asc(cities.createdAt))
    .limit(1);
  return { inviterName: referrer.name, city: capital ? await getPublicCity(capital.id) : null };
}
