import { NAVAL_UNITS, type UnitBag, type UnitType } from "@/game/data";
import { Fire, Ripples } from "@/components/fx/ambient";
import { UnitArt } from "@/components/military/units";
import type { GameCity } from "@/server/game-context";

/**
 * Where docked warships ride at anchor, in % of the 3:2 city scene: out past the merchant
 * moorings (7,79 · 18,83 · 29.5,88), along the deep water at the bottom and one at the harbor
 * mouth on the left edge. `w` is the sprite width in % of the scene (closer water, bigger hull).
 */
const ANCHORAGE = [
  { x: 40, y: 91, w: 8 },
  { x: 51, y: 93.5, w: 8 },
  { x: 3.8, y: 65, w: 7 },
  { x: 61.5, y: 91.5, w: 8 },
];

/** At most one hull per anchorage: every kind of warship shows, the rest follow the fleet's mix. */
export function warshipHulls(units: UnitBag, max = ANCHORAGE.length): UnitType[] {
  const fleet = NAVAL_UNITS.filter((u) => (units[u] ?? 0) > 0);
  const shown = new Map(fleet.map((u) => [u, 1]));
  const total = fleet.reduce((s, u) => s + (units[u] ?? 0), 0);
  for (let used = fleet.length; used < Math.min(max, total); used++) {
    const next = fleet.reduce((a, b) => ((units[b] ?? 0) / shown.get(b)! > (units[a] ?? 0) / shown.get(a)! ? b : a));
    shown.set(next, shown.get(next)! + 1);
  }
  // Take turns so the kinds mix along the coast.
  const hulls: UnitType[] = [];
  for (let round = 0; hulls.length < Math.min(max, total); round++) {
    for (const u of fleet) if (shown.get(u)! > round) hulls.push(u);
  }
  return hulls.slice(0, max);
}

/** The city's docked warships bobbing in the harbor. Decorative: absolutely placed over the scene. */
export function DockedWarships({ city }: { city: GameCity }) {
  const hulls = warshipHulls(city.units);
  if (!hulls.length) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {hulls.map((unit, i) => {
        const a = ANCHORAGE[i];
        const delay = `${(i * -0.9 - 0.4).toFixed(1)}s`;
        return (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%` }}
          >
            <span className="absolute top-[78%] left-1/2 w-[120%] -translate-x-1/2">
              <Ripples count={2} dur={3.9} delay={i * -1.3} peak={0.5} />
            </span>
            <span className="relative block motion-safe:animate-float" style={{ animationDelay: delay }}>
              <UnitArt unit={unit} size={384} sizes="104px" className="sprite block h-auto w-full select-none" />
              {/* A faint flicker over the fire on deck, a few embers drifting up. */}
              {unit === "fireship" && (
                <span className="absolute inset-0 opacity-60 mix-blend-screen">
                  <Fire x={54} y={50} size={30} embers={2} />
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}
