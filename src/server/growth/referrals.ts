import "server-only";
import { and, asc, between, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ambrosiaLedger, cities, players, referrals, reports } from "@/db/schema";
import { track } from "./analytics";
import { referralIdRange } from "./referral-code";

/** Ambrosía each side gets when the invitee reaches the required Intendencia level. */
export const REFERRAL_REWARD = 50;
/** Intendencia (town_hall) level the invitee has to reach. */
export const REFERRAL_TOWN_HALL = 3;
/** Rewarded invites per referrer in any 24 h window. Extra ones wait and settle later. */
export const REFERRAL_MAX_PER_DAY = 5;

const DAY_MS = 24 * 3_600_000;

export interface Referrer {
  id: string;
  name: string;
  wallet: string;
}

/** Who owns an invite code. On the (rare) 40-bit collision the oldest account wins. */
export async function findReferrer(code: string): Promise<Referrer | null> {
  const range = referralIdRange(code);
  if (!range) return null;
  const [row] = await db
    .select({ id: players.id, name: players.name, wallet: players.wallet })
    .from(players)
    .where(between(players.id, range.low, range.high))
    .orderBy(asc(players.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Links a brand-new account to whoever invited it. Called once, right after the account is created.
 * Never throws: a broken invite must not block anybody from playing.
 */
export async function linkReferral(invitee: { id: string; wallet: string }, code: string | null | undefined) {
  if (!code) return null;
  try {
    const referrer = await findReferrer(code);
    if (!referrer) return null;
    // No self-referral: same account or same wallet.
    if (referrer.id === invitee.id || referrer.wallet === invitee.wallet) return null;
    const inserted = await db
      .insert(referrals)
      .values({ inviteeId: invitee.id, referrerId: referrer.id })
      .onConflictDoNothing()
      .returning({ id: referrals.inviteeId });
    if (!inserted.length) return null;
    await track("referral_linked", {}, invitee.id);
    return referrer;
  } catch (err) {
    console.error("[thalassa] linkReferral failed", err);
    return null;
  }
}

// Invitees known to have nothing left to settle (no referral, or already rewarded). Links only
// happen at account creation, so once a player is here they never need another check.
const settled = new Set<string>();

/**
 * Pays the referral reward once the invitee reached the required Intendencia.
 * Idempotent (the referral row flips rewarded_at exactly once) and cheap (one indexed read,
 * then a per-process memo). Returns the ambrosía credited to the invitee, 0 otherwise.
 */
export async function settleReferral(inviteeId: string): Promise<number> {
  if (settled.has(inviteeId)) return 0;
  try {
    const [row] = await db.select().from(referrals).where(eq(referrals.inviteeId, inviteeId));
    if (!row || row.rewardedAt) {
      if (settled.size > 100_000) settled.clear();
      settled.add(inviteeId);
      return 0;
    }
    const credited = await db.transaction(async (tx) => {
      // Serialize settlements per referrer so the daily cap holds under concurrency.
      await tx.execute(sql`select pg_advisory_xact_lock(4244, hashtext(${row.referrerId}))`);
      const [{ n }] = await tx
        .select({ n: count() })
        .from(referrals)
        .where(and(eq(referrals.referrerId, row.referrerId), gt(referrals.rewardedAt, new Date(Date.now() - DAY_MS))));
      if (n >= REFERRAL_MAX_PER_DAY) return 0; // stays pending, settles on a later visit
      const flipped = await tx
        .update(referrals)
        .set({ rewardedAt: new Date() })
        .where(and(eq(referrals.inviteeId, inviteeId), isNull(referrals.rewardedAt)))
        .returning({ id: referrals.inviteeId });
      if (!flipped.length) return 0;

      const people = await tx
        .select({ id: players.id, name: players.name })
        .from(players)
        .where(inArray(players.id, [inviteeId, row.referrerId]));
      const nameOf = new Map(people.map((p) => [p.id, p.name]));
      // Fixed lock order (by id) to stay clear of deadlocks with other writers.
      for (const id of [inviteeId, row.referrerId].sort()) {
        await tx
          .update(players)
          .set({ ambrosia: sql`${players.ambrosia} + ${REFERRAL_REWARD}` })
          .where(eq(players.id, id));
      }
      await tx.insert(ambrosiaLedger).values([
        { playerId: inviteeId, delta: REFERRAL_REWARD, reason: "referral", ref: `invited_by:${row.referrerId}` },
        { playerId: row.referrerId, delta: REFERRAL_REWARD, reason: "referral", ref: `invitee:${inviteeId}` },
      ]);
      await tx.insert(reports).values([
        {
          playerId: inviteeId,
          kind: "system",
          title: "Regalo de bienvenida",
          body: {
            text: `Llegaste a Intendencia ${REFERRAL_TOWN_HALL}. Como te invitó ${nameOf.get(row.referrerId) ?? "otro arconte"}, sumaron ${REFERRAL_REWARD} de ambrosía cada uno.`,
          },
        },
        {
          playerId: row.referrerId,
          kind: "system",
          title: "Tu invitado creció",
          body: {
            text: `${nameOf.get(inviteeId) ?? "Tu invitado"} llegó a Intendencia ${REFERRAL_TOWN_HALL}. Te sumamos ${REFERRAL_REWARD} de ambrosía. Seguí invitando desde la sección Invitar.`,
          },
        },
      ]);
      return REFERRAL_REWARD;
    });
    if (credited > 0) {
      settled.add(inviteeId);
      await track("referral_rewarded", { amount: credited }, inviteeId);
    }
    return credited;
  } catch (err) {
    console.error("[thalassa] settleReferral failed", err);
    return 0;
  }
}

export interface InviteeView {
  id: string;
  name: string;
  townHall: number;
  rewarded: boolean;
  joinedAt: number;
}

/** The invite page: everyone this player brought in, with their Intendencia progress. */
export async function getInvitees(referrerId: string): Promise<InviteeView[]> {
  const rows = await db
    .select({ id: players.id, name: players.name, rewardedAt: referrals.rewardedAt, joinedAt: referrals.createdAt })
    .from(referrals)
    .innerJoin(players, eq(players.id, referrals.inviteeId))
    .where(eq(referrals.referrerId, referrerId))
    .orderBy(asc(referrals.createdAt))
    .limit(200);
  if (!rows.length) return [];
  const cityRows = await db
    .select({ playerId: cities.playerId, buildings: cities.buildings, construction: cities.construction })
    .from(cities)
    .where(inArray(cities.playerId, rows.map((r) => r.id)));
  const now = Date.now();
  const townHall = new Map<string, number>();
  for (const c of cityRows) {
    let level = c.buildings.find((b) => b.type === "town_hall")?.level ?? 0;
    // Stored state lags until the invitee plays again: count a finished Intendencia upgrade.
    if (c.construction?.type === "town_hall" && c.construction.endsAt <= now) level = Math.max(level, c.construction.targetLevel);
    townHall.set(c.playerId, Math.max(townHall.get(c.playerId) ?? 0, level));
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    townHall: townHall.get(r.id) ?? 0,
    rewarded: r.rewardedAt != null,
    joinedAt: r.joinedAt.getTime(),
  }));
}

/**
 * For the referrer's side: settles invitees that already reached the level but haven't played since.
 * Returns the fresh list.
 */
export async function getInviteesSettled(referrerId: string): Promise<InviteeView[]> {
  const invitees = await getInvitees(referrerId);
  const due = invitees.filter((i) => !i.rewarded && i.townHall >= REFERRAL_TOWN_HALL);
  if (!due.length) return invitees;
  let changed = false;
  for (const i of due) changed = (await settleReferral(i.id)) > 0 || changed;
  return changed ? getInvitees(referrerId) : invitees;
}
