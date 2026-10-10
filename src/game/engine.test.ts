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
  resolveCombat,
  setWorkers,
  startConstruction,
  storageCap,
  trainUnits,
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
    expect(() => startConstruction(p, "c1", 12, "academy", T0, 1)).toThrow(/no va en este lugar/);
    expect(() => startConstruction(p, "c1", 1, "tavern", T0, 1)).toThrow(/Intendencia nivel 2/);
    expect(() => startConstruction(p, "c1", 1, "palace", T0, 1)).toThrow(/Expansión/);
  });

  it("validates worker assignments against caps and citizens", () => {
    const p = makePlayer();
    expect(() => setWorkers(p, "c1", { woodWorkers: 41 })).toThrow(GameError);
    expect(() => setWorkers(p, "c1", { luxWorkers: 1 })).toThrow(/Riqueza/);
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

  it("requires prerequisites and points for research", () => {
    const p = makePlayer();
    p.research = 500;
    expect(() => research(p, "pulley")).toThrow(/Conservación/);
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
