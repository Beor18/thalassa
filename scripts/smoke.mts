// End-to-end check of the server game loop against the real database.
// Creates two throwaway players, runs commands, fast-forwards missions and prints the outcome.
// Usage: pnpm smoke
import { generateKeyPairSigner } from "@solana/kit";

process.loadEnvFile(".env.local");

const { db } = await import("../src/db");
const { cities, islands, missions, players, reports } = await import("../src/db/schema");
const { and, eq, inArray } = await import("drizzle-orm");
const { findOrCreatePlayer } = await import("../src/server/world");
const cmd = await import("../src/server/commands");
const { processDueMissions } = await import("../src/server/missions");
const { getSnapshot, getIsland, getRanking } = await import("../src/server/queries");

/** A GameError's message in both languages: `message` is English, `text` carries every language. */
const said = (e: unknown) => {
  const err = e as Error & { text?: { en: string; es: string } };
  return { en: err.message, es: err.text?.es ?? "" };
};

const check = (cond: unknown, label: string) => {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else console.log("ok  ", label);
};

const a = await findOrCreatePlayer((await generateKeyPairSigner()).address);
const b = await findOrCreatePlayer((await generateKeyPairSigner()).address);
const ids = [a.id, b.id];
// The barbarian raid below levels up a shared island: put it back as it was when done.
let restoreIsland: (() => Promise<unknown>) | null = null;

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
  const [camp] = await db
    .select({ level: islands.barbarianLevel, defeatedAt: islands.barbarianDefeatedAt })
    .from(islands)
    .where(eq(islands.id, cityA.islandId));
  restoreIsland = () =>
    db.update(islands).set({ barbarianLevel: camp.level, barbarianDefeatedAt: camp.defeatedAt }).where(eq(islands.id, cityA.islandId));
  // B is fresh and protected; an old account can be raided.
  const protectedErr = await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { spearman: 1 }).then(() => null, said);
  check(protectedErr?.en.includes("under protection") && protectedErr.es.includes("protección"), "newbie protection blocks raids");
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
  await processDueMissions({ wait: true });
  const afterArrival = await db.select().from(missions).where(inArray(missions.playerId, ids));
  check(afterArrival.every((m) => m.status !== "outbound"), "all missions resolved");

  await db.update(missions).set({ returnsAt: past }).where(inArray(missions.playerId, ids));
  await processDueMissions({ wait: true });
  const afterReturn = await db.select().from(missions).where(inArray(missions.playerId, ids));
  check(afterReturn.every((m) => m.status === "done"), "all missions back home");

  const repA = await db.select().from(reports).where(eq(reports.playerId, a.id));
  const repB = await db.select().from(reports).where(eq(reports.playerId, b.id));
  const enTitle = (r: (typeof repA)[number]) => (r.body.title as { en?: string } | undefined)?.en ?? `(es) ${r.title}`;
  console.log("     reports A:", repA.map(enTitle).join(" | "));
  console.log("     reports B:", repB.map(enTitle).join(" | "));
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
  const fourth = await cmd.tradeAmbrosia(a.id, cityA.id, "crystal").then(() => null, said);
  check(fourth?.en.includes("3 times a day") && fourth.es.includes("3 veces"), "merchant capped at 3 per city per day");
  const { ambrosiaLedger } = await import("../src/db/schema");
  await db.insert(ambrosiaLedger).values({ playerId: a.id, delta: -299, reason: "finish:construction" });
  const capped = await cmd.finishNow(a.id, cityA.id, "construction").then(() => null, said);
  check(capped?.en.includes("Daily limit") && capped.es.includes("tope diario"), "instant finish capped at 300 per day");

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
  // Only this run's players: never fast-forward anyone else's colonists.
  await db.update(missions).set({ arrivesAt: past }).where(and(eq(missions.kind, "colonize"), inArray(missions.playerId, ids)));
  await processDueMissions({ wait: true });
  const colonies = await db.select().from(cities).where(eq(cities.playerId, a.id));
  check(colonies.length === 2, "colony founded");

  // Warships: built at the Port, sail without merchant ships, fight at sea before anyone lands.
  const settle = async () => {
    const now = new Date(Date.now() - 1000);
    const mine = inArray(missions.playerId, ids);
    await db.update(missions).set({ arrivesAt: now }).where(and(mine, eq(missions.status, "outbound")));
    await processDueMissions({ wait: true });
    await db.update(missions).set({ returnsAt: now }).where(and(mine, eq(missions.status, "returning")));
    await processDueMissions({ wait: true });
  };
  await db
    .update(cities)
    .set({
      buildings: [
        { slot: 0, type: "town_hall", level: 3 },
        { slot: 1, type: "barracks", level: 4 },
        { slot: 12, type: "port", level: 6 },
      ],
      population: 170,
      wood: 2000,
      sulfur: 2000,
      ships: 2,
      units: { swordsman: 60, fireship: 6 },
      training: [],
    })
    .where(eq(cities.id, cityA.id));
  await db.update(players).set({ techs: ["expansion", "wisdom", "shipbuilding"] }).where(eq(players.id, a.id));
  const keel = await cmd.train(a.id, cityA.id, "trireme", 2);
  check(keel.unit === "trireme" && keel.startedAt <= Date.now(), "triremes on the slipway at the Port");
  await db.update(cities).set({ units: { trireme: 3, spearman: 10 } }).where(eq(cities.id, cityB.id));

  await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { swordsman: 50 });
  await settle();
  const [harborB] = await db.select({ units: cities.units }).from(cities).where(eq(cities.id, cityB.id));
  const [homeA] = await db.select({ units: cities.units }).from(cities).where(eq(cities.id, cityA.id));
  check(harborB.units.trireme === 3 && homeA.units.swordsman === 60, "no warships: turned back at sea, troops home intact");

  await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { swordsman: 50, fireship: 6 });
  await settle();
  const [sunkB] = await db.select({ units: cities.units }).from(cities).where(eq(cities.id, cityB.id));
  check(!sunkB.units.trireme, "fire ships cleared the sea and the troops landed");

  await db.update(cities).set({ ships: 0 }).where(eq(cities.id, cityA.id));
  const fleet = await cmd.sendAttack(a.id, cityA.id, { cityId: cityB.id }, { fireship: 2 });
  check(fleet.ships === 0, "warships sail without merchant ships");
  await settle();

  const naval = (await db.select().from(reports).where(and(eq(reports.kind, "battle"), inArray(reports.playerId, ids)))).filter(
    (r) => (r.body.target as { kind?: string } | undefined)?.kind === "city" && r.body.sea,
  );
  const enOf = (r: (typeof naval)[number]) => (r.body.title as { en: string }).en;
  console.log("     naval reports:", naval.map(enOf).join(" | "));
  check(
    naval.some((r) => r.playerId === a.id && r.body.turnedBack && enOf(r).startsWith("Turned back at sea")) &&
      naval.some((r) => r.playerId === b.id && r.body.turnedBack && enOf(r).startsWith("Your fleet turned back")),
    "both sides got a turned-back-at-sea report",
  );
  check(naval.some((r) => r.playerId === a.id && !r.body.turnedBack && r.body.attackerWins), "sea battle won, then the land battle");
} catch (err) {
  console.error("FAIL unexpected error:", err);
  process.exitCode = 1;
} finally {
  // Clean up the throwaway players (cascades to cities, missions, reports).
  await db.delete(missions).where(inArray(missions.playerId, ids));
  await db.delete(players).where(inArray(players.id, ids));
  await restoreIsland?.();
  process.exit(process.exitCode ?? 0);
}
