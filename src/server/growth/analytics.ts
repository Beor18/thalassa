import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, type AnalyticsProps } from "@/db/schema";
import { CLIENT_EVENTS, type ClientEvent } from "@/lib/growth/events";

/**
 * First-party funnel analytics. No third-party scripts, no IPs, no user agents, no cookies.
 * Every helper here swallows its own errors: measuring must never break the game.
 */

export { CLIENT_EVENTS, type ClientEvent };

/** Events only the server records. */
export const SERVER_EVENTS = [
  "login_success",
  "first_build_started",
  "first_research",
  "first_attack_sent",
  "faucet_claimed",
  "ambrosia_purchased",
  "active_day",
  "invite_open",
  "referral_linked",
  "referral_rewarded",
] as const;

export type ServerEvent = (typeof SERVER_EVENTS)[number];
export type EventName = ClientEvent | ServerEvent;

const MAX_KEYS = 8;
const KEY_RE = /^[a-z][a-z0-9_]{0,23}$/;

/** Keeps props small and flat: up to 8 keys, short strings, finite numbers, booleans. */
export function cleanProps(input: unknown): AnalyticsProps {
  const out: AnalyticsProps = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (!KEY_RE.test(key)) continue;
    if (typeof value === "string") out[key] = value.slice(0, 64);
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.round(value * 1000) / 1000;
    else if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

export async function track(name: EventName, props: AnalyticsProps = {}, playerId?: string | null, sid?: string | null) {
  try {
    await db.insert(analyticsEvents).values({ name, props: cleanProps(props), playerId: playerId ?? null, sid: sid ?? null });
  } catch (err) {
    console.error("[thalassa] track failed", name, err);
  }
}

// Per-process memo so repeated checks skip the database. Bounded: cleared when it grows too big.
const seen = new Map<string, string>();
function remember(key: string, value: string) {
  if (seen.size > 50_000) seen.clear();
  seen.set(key, value);
}

/** Records `name` for a player only the first time it ever happens (first_build_started, first_research...). */
export async function trackFirst(name: ServerEvent, playerId: string, props: AnalyticsProps = {}) {
  const key = `${name}:${playerId}`;
  if (seen.has(key)) return;
  try {
    await db.execute(sql`
      insert into ${analyticsEvents} (name, player_id, props)
      select ${name}, ${playerId}, ${JSON.stringify(cleanProps(props))}::jsonb
      where not exists (
        select 1 from ${analyticsEvents} where name = ${name} and player_id = ${playerId}
      )`);
    remember(key, "1");
  } catch (err) {
    console.error("[thalassa] trackFirst failed", name, err);
  }
}

/** One `active_day` row per player per UTC day: the base for DAU and D1/D7/D30 retention. */
export async function trackActiveDay(playerId: string, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const key = `active:${playerId}`;
  if (seen.get(key) === day) return;
  try {
    await db.execute(sql`
      insert into ${analyticsEvents} (name, player_id, props)
      select 'active_day', ${playerId}, ${JSON.stringify({ day })}::jsonb
      where not exists (
        select 1 from ${analyticsEvents}
        where name = 'active_day' and player_id = ${playerId} and props->>'day' = ${day}
      )`);
    remember(key, day);
  } catch (err) {
    console.error("[thalassa] trackActiveDay failed", err);
  }
}
