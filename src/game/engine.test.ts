import { describe, expect, it } from "vitest";
import { BALANCE } from "./data";
import {
  GameError,
  advance,
  buildingCost,
  cityRates,
  computeLoot,
  finishWithAmbrosia,
  housing,
  research,
  resolveAssault,
  resolveCombat,
  setWorkers,
  startConstruction,
  storageCap,
  trainUnits,
  transportShipsFor,
  unitCost,
  type CityState,
  type PlayerState,
} from "./engine";

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 10, 12);

function makePlayer(overrides: Partial<CityState> = {}): PlayerState {
  const city: CityState = {
    id: "c1",
    name: "Polis",
    isCapital: true,
    islandId: 1,
    slot: 0,
    island: { id: 1, name: "Naxos", x: 0, y: 0, resource: "marble", sawmillLevel: 1, mineLevel: 1 },
    res: { wood: 1000, wine: 300, marble: 400, crystal: 150, sulfur: 150 },
    population: 40,
    woodWorkers: 0,
    luxWorkers: 0,
    scientists: 0,
    wineLevel: 0,
    ships: 0,
    buildings: [{ slot: 0, type: "town_hall", level: 1 }],
    units: {},
    construction: null,
    training: [],
    ...overrides,
  };
  return { id: "p1", name: "Arconte", wallet: "w", gold: 1000, research: 0, ambrosia: 0, techs: [], lastTick: T0, awayUpkeep: 0, cities: [city] };
}

describe("advance", () => {
  it("produces wood from loggers and gold from free citizens", () => {
    const p = makePlayer({ woodWorkers: 20, population: 60 });
    advance(p, T0 + HOUR, 1);
    expect(p.cities[0].res.wood).toBeCloseTo(1000 + 20 * BALANCE.woodPerWorker, 5);
    // 40 free citizens pay 3 gold each per hour
    expect(p.gold).toBeCloseTo(1000 + 40 * BALANCE.goldPerCitizen, 0);
  });

  it("scales with game speed and stops at storage capacity", () => {
    const p = makePlayer({ woodWorkers: 30, population: 60 });
    advance(p, T0 + 10 * HOUR, 10);
    expect(p.cities[0].res.wood).toBe(storageCap(p, p.cities[0]));
  });

  it("grows population toward housing and never past it", () => {
    const p = makePlayer();
    advance(p, T0 + 48 * HOUR, 1);
    expect(p.cities[0].population).toBeLessThanOrEqual(housing(p.cities[0]));
    expect(p.cities[0].population).toBeGreaterThan(59);
  });

  it("completes a construction exactly at its end time", () => {
    const p = makePlayer();
    const k = startConstruction(p, "c1", 1, "academy", T0, 1);
    advance(p, k.endsAt - 1000, 1);
    expect(p.cities[0].buildings.find((b) => b.type === "academy")).toBeUndefined();
    advance(p, k.endsAt, 1);
    expect(p.cities[0].buildings.find((b) => b.type === "academy")?.level).toBe(1);
    expect(p.cities[0].construction).toBeNull();
  });

  it("burns wine only while the tavern serves it", () => {
    const p = makePlayer({
      wineLevel: 1,
      buildings: [
        { slot: 0, type: "town_hall", level: 2 },
        { slot: 1, type: "tavern", level: 1 },
      ],
      res: { wood: 0, wine: 2, marble: 0, crystal: 0, sulfur: 0 },
    });
    advance(p, T0 + HOUR, 1);
    expect(p.cities[0].res.wine).toBe(0);
  });
});

describe("commands", () => {
  it("charges the building cost and rejects a second construction", () => {
    const p = makePlayer();
    const cost = buildingCost(p, p.cities[0], "academy", 1);
    startConstruction(p, "c1", 1, "academy", T0, 1);
    expect(p.cities[0].res.wood).toBe(1000 - cost.wood);
    expect(() => startConstruction(p, "c1", 2, "warehouse", T0, 1)).toThrow(GameError);
  });

  it("enforces slot kinds and requirements", () => {
    const p = makePlayer();
    expect(() => startConstruction(p, "c1", 12, "academy", T0, 1)).toThrow(/doesn't go here/);
    expect(() => startConstruction(p, "c1", 1, "tavern", T0, 1)).toThrow(/Town Hall level 2/);
    expect(() => startConstruction(p, "c1", 1, "palace", T0, 1)).toThrow(/Expansion/);
  });

  it("validates worker assignments against caps and citizens", () => {
    const p = makePlayer();
    expect(() => setWorkers(p, "c1", { woodWorkers: 41 })).toThrow(GameError);
    expect(() => setWorkers(p, "c1", { luxWorkers: 1 })).toThrow(/Wealth/);
    setWorkers(p, "c1", { woodWorkers: 30 });
    expect(cityRates(p, p.cities[0], 1).freeCitizens).toBe(10);
  });

  it("finishes a construction with ambrosia", () => {
    const p = makePlayer();
    p.ambrosia = 100;
    startConstruction(p, "c1", 1, "academy", T0, 1);
    const price = finishWithAmbrosia(p, "c1", "construction", T0);
    expect(price).toBeGreaterThan(0);
    expect(p.ambrosia).toBe(100 - price);
    expect(p.cities[0].buildings.some((b) => b.type === "academy")).toBe(true);
  });

  it("queues training batches one after another", () => {
    const p = makePlayer({ buildings: [{ slot: 0, type: "town_hall", level: 2 }, { slot: 1, type: "barracks", level: 1 }] });
    const a = trainUnits(p, "c1", "spearman", 5, T0, 1, "a");
    const b = trainUnits(p, "c1", "spearman", 5, T0, 1, "b");
    expect(b.startedAt).toBe(a.endsAt);
    expect(p.cities[0].population).toBe(30);
    advance(p, b.endsAt, 1);
    expect(p.cities[0].units.spearman).toBe(10);
  });

  it("builds warships at the Port, in their own queue, cheaper with Shipbuilding", () => {
    const p = makePlayer({
      buildings: [
        { slot: 0, type: "town_hall", level: 2 },
        { slot: 1, type: "barracks", level: 1 },
        { slot: 12, type: "port", level: 1 },
      ],
    });
    expect(() => trainUnits(p, "c1", "trireme", 1, T0, 1, "x")).toThrow(/Port level 2/);
    p.cities[0].buildings[2].level = 6;
    expect(() => trainUnits(p, "c1", "fireship", 1, T0, 1, "x")).toThrow(/Shipbuilding/);
    const troops = trainUnits(p, "c1", "spearman", 5, T0, 1, "a");
    const ships = trainUnits(p, "c1", "trireme", 2, T0, 1, "b");
    // The shipyard doesn't wait for the Barracks.
    expect(ships.startedAt).toBe(T0);
    expect(troops.startedAt).toBe(T0);
    expect(p.cities[0].population).toBe(33);
    expect(p.cities[0].res.sulfur).toBe(150 - 2 * 40);
    p.techs = ["shipbuilding"];
    expect(unitCost(p, "trireme")).toEqual({ wood: 102, sulfur: 34 });
    expect(unitCost(p, "spearman")).toEqual({ wood: 30 });
    advance(p, ships.endsAt, 1);
    expect(p.cities[0].units.trireme).toBe(2);
  });

  it("requires prerequisites and points for research", () => {
    const p = makePlayer();
    p.research = 500;
    expect(() => research(p, "pulley")).toThrow(/Conservation/);
    research(p, "conservation");
    research(p, "pulley");
    expect(p.techs).toEqual(["conservation", "pulley"]);
    expect(p.research).toBe(500 - 30 - 60);
  });
});

describe("combat", () => {
  it("an overwhelming attacker wins with light losses", () => {
    const r = resolveCombat({ swordsman: 100 }, { spearman: 10 }, 0);
    expect(r.attackerWins).toBe(true);
    expect(r.attackerLosses.swordsman ?? 0).toBeLessThan(10);
    expect(r.defenderSurvivors.spearman ?? 0).toBe(0);
  });

  it("walls make defenders stronger and catapults cancel them", () => {
    const noCatapults = resolveCombat({ spearman: 50 }, { spearman: 40 }, 10);
    expect(noCatapults.attackerWins).toBe(false);
    const withCatapults = resolveCombat({ spearman: 50, catapult: 20 }, { spearman: 40 }, 10);
    expect(withCatapults.effectiveWall).toBe(0);
    expect(withCatapults.attackerWins).toBe(true);
  });

  it("splits loot across resources within ship capacity", () => {
    const loot = computeLoot({ wood: 1000, marble: 1000 }, 500);
    expect(loot.wood + loot.marble).toBeLessThanOrEqual(500);
    expect(loot.wood).toBe(loot.marble);
  });
});

describe("naval combat", () => {
  it("warships sail alone: only land troops need merchant ships", () => {
    expect(transportShipsFor({ trireme: 30 })).toBe(0);
    expect(transportShipsFor({ trireme: 30, spearman: 51 })).toBe(2);
  });

  it("with no fleet in port there is no sea battle and warships join the land assault", () => {
    const r = resolveAssault({ spearman: 20, trireme: 10 }, { spearman: 10 }, 0);
    expect(r.sea).toBeNull();
    expect(r.turnedBack).toBe(false);
    // 20 × 4 + 10 × 14 against 10 × 6
    expect(r.land?.attackPower).toBe(220);
    expect(r.attackerWins).toBe(true);
  });

  it("clearing the sea lets the troops land; the wall only counts on land", () => {
    const r = resolveAssault({ spearman: 60, fireship: 10 }, { spearman: 20, trireme: 5 }, 5);
    expect(r.sea?.attackerWins).toBe(true);
    expect(r.sea?.effectiveWall).toBe(0);
    expect(r.land).not.toBeNull();
    expect(r.land?.effectiveWall).toBe(5);
    expect(r.attackerWins).toBe(true);
    // Losses add up both battles and every defending trireme is gone.
    expect(r.defenderSurvivors.trireme ?? 0).toBe(0);
    expect(r.defenderLosses.trireme).toBe(5);
  });

  it("a fleet that can't clear the sea is turned back: no landing, troops sail home intact", () => {
    const r = resolveAssault({ swordsman: 200, trireme: 2 }, { spearman: 5, trireme: 6 }, 3);
    expect(r.sea?.attackerWins).toBe(false);
    expect(r.turnedBack).toBe(true);
    expect(r.land).toBeNull();
    expect(r.attackerWins).toBe(false);
    expect(r.attackerSurvivors.swordsman).toBe(200);
    expect(r.attackerLosses.trireme).toBeGreaterThan(0);
    expect(r.defenderSurvivors.spearman).toBe(5);
  });

  it("troops with no warships can't land where a fleet is docked", () => {
    const r = resolveAssault({ swordsman: 500 }, { trireme: 1 }, 0);
    expect(r.turnedBack).toBe(true);
    expect(r.attackerSurvivors.swordsman).toBe(500);
    expect(r.defenderSurvivors.trireme).toBe(1);
  });
});
