import { describe, expect, it } from "vitest";
import { cityRates, housing, storageCap, type CityState, type PlayerState } from "@/game/engine";
import { affordability, levelGain, readyUpgrades, withLevel } from "./effects";

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
    woodWorkers: 20,
    luxWorkers: 0,
    scientists: 0,
    wineLevel: 0,
    ships: 0,
    buildings: [
      { slot: 0, type: "town_hall", level: 1 },
      { slot: 1, type: "warehouse", level: 1 },
    ],
    units: {},
    construction: null,
    training: [],
    ...overrides,
  };
  return { id: "p1", name: "Arconte", wallet: "w", gold: 1000, research: 0, ambrosia: 0, techs: [], lastTick: 0, awayUpkeep: 0, cities: [city] };
}

const withRates = (p: PlayerState) => ({ ...p.cities[0], rates: cityRates(p, p.cities[0], 1) });

describe("levelGain", () => {
  it("matches the engine for housing and storage", () => {
    const p = makePlayer();
    const city = p.cities[0];
    const housingGain = housing(withLevel(city, 0, "town_hall", 2)) - housing(city);
    expect(levelGain(p, city, 0, "town_hall", 2, "es")).toEqual([`+${housingGain} viviendas`]);
    expect(levelGain(p, city, 0, "town_hall", 2, "en")).toEqual([`+${housingGain} housing`]);
    const cap = storageCap(p, withLevel(city, 1, "warehouse", 2)) - storageCap(p, city);
    expect(levelGain(p, city, 1, "warehouse", 2, "es")[0]).toBe(`+${cap.toLocaleString("es-AR")} de capacidad`);
    expect(levelGain(p, city, 1, "warehouse", 2, "en")[0]).toBe(`+${cap.toLocaleString("en-US")} capacity`);
  });

  it("previews a building that is not there yet", () => {
    const p = makePlayer();
    expect(levelGain(p, p.cities[0], 5, "academy", 1, "es")).toEqual(["+8 pupitres"]);
    expect(levelGain(p, p.cities[0], 5, "academy", 1, "en")).toEqual(["+8 desks"]);
  });

  it("names the units a barracks level unlocks", () => {
    const p = makePlayer({ buildings: [{ slot: 3, type: "barracks", level: 3 }] });
    expect(levelGain(p, p.cities[0], 3, "barracks", 4, "es")).toEqual(["entrena 2% más rápido", "habilita Espadachín"]);
    expect(levelGain(p, p.cities[0], 3, "barracks", 4, "en")).toEqual(["trains 2% faster", "unlocks Swordsmen"]);
  });

  it("stops counting carpenter savings at the cap", () => {
    const p = makePlayer({ buildings: [{ slot: 2, type: "carpenter", level: 20 }] });
    p.techs = ["pulley"];
    expect(levelGain(p, p.cities[0], 2, "carpenter", 21, "en")).toEqual([]);
  });
});

describe("affordability", () => {
  it("is clear when the city can pay", () => {
    const p = makePlayer();
    expect(affordability({ wood: 100 }, withRates(p), "en")).toEqual({ missing: null, etaMs: null, tooBig: false });
  });

  it("estimates when production covers the gap", () => {
    const p = makePlayer();
    // 20 loggers make 20 wood per hour: 200 short is ten hours away.
    const a = affordability({ wood: 1200 }, withRates(p), "es");
    expect(a.missing).toBe("Te falta 200 de madera.");
    expect(a.etaMs).toBeCloseTo(10 * 3_600_000, -3);
    expect(affordability({ wood: 1200 }, withRates(p), "en").missing).toBe("You need 200 more wood.");
  });

  it("names every missing resource in both languages", () => {
    const p = makePlayer();
    const cost = { wood: 2200, marble: 1400 };
    expect(affordability(cost, withRates(p), "es").missing).toBe("Te faltan 1.200 de madera y 1.000 de mármol.");
    expect(affordability(cost, withRates(p), "en").missing).toBe("You need 1,200 more wood and 1,000 more marble.");
  });

  it("has no estimate for something nobody produces or that never fits", () => {
    const p = makePlayer();
    expect(affordability({ crystal: 500 }, withRates(p), "en").etaMs).toBeNull();
    const big = affordability({ wood: 999_999 }, withRates(p), "en");
    expect(big.tooBig).toBe(true);
    expect(big.etaMs).toBeNull();
  });
});

describe("readyUpgrades", () => {
  it("lists what the city can pay and nothing while it builds", () => {
    const p = makePlayer();
    const ready = readyUpgrades(p, withRates(p), 1);
    expect(ready.map((o) => o.type)).toEqual(["town_hall", "warehouse"]);
    const busy = makePlayer({ construction: { slot: 0, type: "town_hall", targetLevel: 2, startedAt: 0, endsAt: 1, cost: { wood: 0, wine: 0, marble: 0, crystal: 0, sulfur: 0 } } });
    expect(readyUpgrades(busy, withRates(busy), 1)).toEqual([]);
  });
});

