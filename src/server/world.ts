import "server-only";
import { count, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { cities, islands, players, reports } from "@/db/schema";
import { BALANCE, ISLAND_PLOTS, LUXURY_RESOURCES } from "@/game/data";

const ISLAND_NAMES = [
  "Naxos", "Paros", "Milos", "Thera", "Andros", "Kythnos", "Serifos", "Sifnos", "Ios", "Amorgos",
  "Delos", "Mykonos", "Tinos", "Syros", "Kea", "Folegandros", "Sikinos", "Anafi", "Astypalea", "Kalymnos",
  "Leros", "Patmos", "Kos", "Nisyros", "Tilos", "Symi", "Halki", "Karpathos", "Kasos", "Ikaria",
  "Samos", "Fourni", "Lipsi", "Donousa", "Koufonisi", "Schinoussa",
];

/** Tiny deterministic PRNG so every fresh database gets the same archipelago. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateArchipelago() {
  const rand = mulberry32(20261010);
  const out: { name: string; x: number; y: number; resource: (typeof LUXURY_RESOURCES)[number]; barbarianLevel: number; variant: number }[] = [];
  const used = new Set<string>();
  // 6x6 jittered grid on a 24x24 sea
  for (let gy = 0; gy < 6; gy++) {
    for (let gx = 0; gx < 6; gx++) {
      const i = gy * 6 + gx;
      let x = gx * 4 + Math.floor(rand() * 3);
      const y = gy * 4 + Math.floor(rand() * 3);
      while (used.has(`${x},${y}`)) x = (x + 1) % 24;
      used.add(`${x},${y}`);
      out.push({
        name: ISLAND_NAMES[i],
        x,
        y,
        resource: LUXURY_RESOURCES[(gx + gy * 2) % 4],
        barbarianLevel: 1 + Math.floor(rand() * 4),
        variant: Math.floor(rand() * 3),
      });
    }
  }
  return out;
}

export async function ensureWorld() {
  const [{ n }] = await db.select({ n: count() }).from(islands);
  if (n > 0) return;
  await db.insert(islands).values(generateArchipelago()).onConflictDoNothing();
}

async function pickHome(tx: Tx) {
  // Fill islands near the center first, never more than 6 of 8 plots for newcomers.
  const rows = await tx
    .select({ id: islands.id, x: islands.x, y: islands.y, used: sql<number>`count(${cities.id})::int` })
    .from(islands)
    .leftJoin(cities, eq(cities.islandId, islands.id))
    .groupBy(islands.id);
  const candidates = rows
    .filter((r) => r.used < ISLAND_PLOTS - 2)
    .sort((a, b) => a.used - b.used || Math.hypot(a.x - 11, a.y - 11) - Math.hypot(b.x - 11, b.y - 11));
  for (const island of candidates) {
    const taken = await tx.select({ slot: cities.slot }).from(cities).where(eq(cities.islandId, island.id));
    const takenSet = new Set(taken.map((t) => t.slot));
    const free = Array.from({ length: ISLAND_PLOTS }, (_, i) => i).filter((s) => !takenSet.has(s));
    if (free.length) return { islandId: island.id, slot: free[Math.floor(Math.random() * free.length)] };
  }
  throw new Error("El archipiélago está lleno.");
}

/** Returns the player for a wallet, founding their capital the first time. */
export async function findOrCreatePlayer(wallet: string): Promise<{ id: string; created: boolean }> {
  const [existing] = await db.select({ id: players.id }).from(players).where(eq(players.wallet, wallet));
  if (existing) return { id: existing.id, created: false };
  await ensureWorld();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4243)`);
    const [again] = await tx.select({ id: players.id }).from(players).where(eq(players.wallet, wallet));
    if (again) return { id: again.id, created: false };

    const short = wallet.slice(0, 4);
    const [player] = await tx
      .insert(players)
      .values({ wallet, name: `Arconte ${short}`, gold: BALANCE.startingGold, lastTick: new Date() })
      .returning({ id: players.id });
    const home = await pickHome(tx);
    const r = BALANCE.startingResources;
    await tx.insert(cities).values({
      playerId: player.id,
      islandId: home.islandId,
      slot: home.slot,
      name: `Polis ${short}`,
      isCapital: true,
      ...r,
      population: BALANCE.startingPopulation,
      buildings: [{ slot: 0, type: "town_hall", level: 1 }],
      units: {},
      training: [],
    });
    await tx.insert(reports).values({
      playerId: player.id,
      kind: "system",
      title: "Bienvenido al Egeo",
      body: {
        text: "Fundaste tu polis. Mandá ciudadanos al aserradero, levantá una Academia y prepará la flota. Antes de atacar a los bárbaros de la isla, mirá cuántos son.",
      },
    });
    return { id: player.id, created: true };
  });
}
