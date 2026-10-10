import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { CLIENT_EVENTS, cleanProps, track } from "@/server/growth/analytics";
import { readSession } from "@/server/session";

/**
 * First-party analytics beacon: POST { e, p?, sid? } from navigator.sendBeacon.
 * Only whitelisted event names, tiny payloads, same-origin, rate limited in memory.
 * Nothing about the visitor is stored besides the event, its props and a random per-tab id.
 */

const MAX_BODY = 2048;
const WINDOW_MS = 60_000;
const PER_CLIENT = 30;
const PER_INSTANCE = 1200;

const Body = z.object({
  e: z.enum(CLIENT_EVENTS),
  p: z.record(z.string(), z.unknown()).optional(),
  sid: z
    .string()
    .regex(/^[a-z0-9]{8,32}$/i)
    .optional(),
});

// Sliding-ish window counters. Keys are salted hashes of the client address, kept only in memory.
const hits = new Map<string, { n: number; since: number }>();
let total = { n: 0, since: 0 };
const salt = randomBytes(16).toString("hex");

function limited(clientKey: string, now: number) {
  if (now - total.since > WINDOW_MS) total = { n: 0, since: now };
  if (++total.n > PER_INSTANCE) return true;
  if (hits.size > 20_000) hits.clear();
  const h = hits.get(clientKey);
  if (!h || now - h.since > WINDOW_MS) {
    hits.set(clientKey, { n: 1, since: now });
    return false;
  }
  return ++h.n > PER_CLIENT;
}

const noContent = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  // Same-origin only: browsers send Sec-Fetch-Site, and Origin on cross-site posts.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "local";
  const clientKey = createHash("sha256").update(salt + forwarded).digest("base64url").slice(0, 16);
  if (limited(clientKey, Date.now())) return new Response(null, { status: 429 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return new Response(null, { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const session = await readSession().catch(() => null);
  await track(parsed.data.e, cleanProps(parsed.data.p), session?.playerId ?? null, parsed.data.sid?.toLowerCase() ?? null);
  return noContent();
}
