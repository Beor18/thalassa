// End-to-end check of the server game loop against the real database.
// Creates two throwaway players, runs commands, fast-forwards missions and prints the outcome.
// Usage: pnpm smoke
import { generateKeyPairSigner } from "@solana/kit";

process.loadEnvFile(".env.local");

const { db } = await import("../src/db");
const { cities, missions, players, reports } = await import("../src/db/schema");
const { eq, inArray } = await import("drizzle-orm");
const { findOrCreatePlayer } = await import("../src/server/world");
const cmd = await import("../src/server/commands");
const { processDueMissions } = await import("../src/server/missions");
const { getSnapshot, getIsland, getRanking } = await import("../src/server/queries");

const check = (cond: unknown, label: string) => {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else console.log("ok  ", label);
};

const a = await findOrCreatePlayer((await generateKeyPairSigner()).address);
const b = await findOrCreatePlayer((await generateKeyPairSigner()).address);
const ids = [a.id, b.id];

try {
  const [cityA] = await db.select().from(cities).where(eq(cities.playerId, a.id));
  const [cityB] = await db.select().from(cities).where(eq(cities.playerId, b.id));

  // Give A an army, ships, barracks and a port so we can exercise missions.
  await db
    .update(cities)
    .set({
      ships: 5,
      units: { swordsman: 120, spearman: 40 },
      buildings: [
        { slot: 0, type: "town_hall", level: 3 },
        { slot: 1, type: "barracks", level: 4 },
        { slot: 12, type: "port", level: 1 },
      ],
    })
    .where(eq(cities.id, cityA.id));
  await db.update(players).set({ techs: ["expansion", "wisdom"] }).where(eq(players.id, a.id));
  // B is fresh and protected; an old account can be raided.
  const protectedErr = await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { spearman: 1 }).catch((e: Error) => e.message);
  check(typeof protectedErr === "string" && protectedErr.includes("protección"), "newbie protection blocks raids");
  await db.update(players).set({ createdAt: new Date(Date.now() - 30 * 24 * 3_600_000) }).where(eq(players.id, b.id));

  await cmd.assignWorkers(a.id, cityA.id, { woodWorkers: 20 });
  const built = await cmd.build(a.id, cityA.id, 2, "academy");
  check(built.type === "academy", "construction started");

  const t = await cmd.sendTransport(a.id, cityA.id, cityB.id, { wood: 200, marble: 50 });
  const atk = await cmd.sendAttack(a.id, cityA.id, { barbariansOnIsland: cityA.islandId }, { swordsman: 100 });
  const raid = await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { spearman: 40 });
  check(t.id && atk.id && raid.id, "missions dispatched");

  // Fast-forward: make every mission arrive now, then return now.
  const past = new Date(Date.now() - 1000);
  await db.update(missions).set({ arrivesAt: past }).where(inArray(missions.playerId, ids));
  await processDueMissions();
  const afterArrival = await db.select().from(missions).where(inArray(missions.playerId, ids));
  check(afterArrival.every((m) => m.status !== "outbound"), "all missions resolved");

  await db.update(missions).set({ returnsAt: past }).where(inArray(missions.playerId, ids));
  await processDueMissions();
  const afterReturn = await db.select().from(missions).where(inArray(missions.playerId, ids));
  check(afterReturn.every((m) => m.status === "done"), "all missions back home");

  const repA = await db.select().from(reports).where(eq(reports.playerId, a.id));
  const repB = await db.select().from(reports).where(eq(reports.playerId, b.id));
  console.log("     reports A:", repA.map((r) => r.title).join(" | "));
  console.log("     reports B:", repB.map((r) => r.title).join(" | "));
  check(repA.some((r) => r.kind === "battle") && repB.some((r) => r.kind === "battle"), "battle reports for both sides");
  check(repB.some((r) => r.kind === "transport"), "receiver got a transport report");

  const snapA = await getSnapshot(a.id);
  const snapB = await getSnapshot(b.id);
  check(snapA && snapA.cities[0].ships === 5, "ships returned to port");
  // B got +200 wood by sea, then a 1-ship raid could carry away at most 500 in total.
  check(snapB && snapB.cities[0].res.wood > 1200 - 500 && snapB.cities[0].res.wood < 1200, "transport delivered, raid looted");
  console.log("     A units:", JSON.stringify(snapA?.cities[0].units), "A wood:", Math.floor(snapA!.cities[0].res.wood));

  // Néctar caps: merchant 3x per city per day, instant finish 300 per day.
  await db.update(players).set({ ambrosia: 1000 }).where(eq(players.id, a.id));
  await db.update(cities).set({ crystal: 0 }).where(eq(cities.id, cityA.id)); // room for 3 deliveries
  for (let i = 0; i < 3; i++) await cmd.tradeAmbrosia(a.id, cityA.id, "crystal");
  const fourth = await cmd.tradeAmbrosia(a.id, cityA.id, "crystal").catch((e: Error) => e.message);
  check(typeof fourth === "string" && fourth.includes("3 veces"), "merchant capped at 3 per city per day");
  const { ambrosiaLedger } = await import("../src/db/schema");
  await db.insert(ambrosiaLedger).values({ playerId: a.id, delta: -299, reason: "finish:construction" });
  const capped = await cmd.finishNow(a.id, cityA.id, "construction").catch((e: Error) => e.message);
  check(typeof capped === "string" && capped.includes("tope diario"), "instant finish capped at 300 per day");

  const island = await getIsland(cityA.islandId, a.id);
  check(island && island.barbarians.level >= 1, "island view loads");
  const ranking = await getRanking();
  check(ranking.length >= 2, "ranking loads");

  // Colonize: give A a palace and send colonists to a free plot on B's island.
  await db
    .update(cities)
    .set({
      buildings: [
        { slot: 0, type: "town_hall", level: 3 },
        { slot: 1, type: "barracks", level: 4 },
        { slot: 3, type: "palace", level: 1 },
        { slot: 12, type: "port", level: 1 },
      ],
      population: 120,
      wood: 3000,
    })
    .where(eq(cities.id, cityA.id));
  await db.update(players).set({ gold: 5000 }).where(eq(players.id, a.id));
  const islandB = await getIsland(cityB.islandId, a.id);
  const freeSlot = [0, 1, 2, 3, 4, 5, 6, 7].find((s) => !islandB!.cities.some((c) => c.slot === s))!;
  await cmd.sendColonists(a.id, cityA.id, cityB.islandId, freeSlot, "Nueva Atenas");
  await db.update(missions).set({ arrivesAt: past }).where(eq(missions.kind, "colonize"));
  await processDueMissions();
  const colonies = await db.select().from(cities).where(eq(cities.playerId, a.id));
  check(colonies.length === 2, "colony founded");
} catch (err) {
  console.error("FAIL unexpected error:", err);
  process.exitCode = 1;
} finally {
  // Clean up the throwaway players (cascades to cities, missions, reports).
  await db.delete(missions).where(inArray(missions.playerId, ids));
  await db.delete(players).where(inArray(players.id, ids));
  process.exit(process.exitCode ?? 0);
}
