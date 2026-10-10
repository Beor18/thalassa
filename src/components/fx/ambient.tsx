import clsx from "clsx";
import type { CSSProperties } from "react";
import { fx } from "./classes";

/*
  Ambient layers for the painted scenes. Pure markup + CSS (no hooks), so they render on the
  server and cost nothing in JS. Positions are in % of the scene; every number is fixed, never
  random, so the server HTML and the client always match.
*/

type Vars = CSSProperties & Record<`--${string}`, string | number | undefined>;

/** Width / height of the painted scenes (3:2). Used to aim sprites along their path. */
const ASPECT = 1.5;

/** Clockwise angle from "up" for a sprite that travels from (x0, y0) to (x1, y1), in scene %. */
export function heading(x0: number, y0: number, x1: number, y1: number): number {
  return (Math.atan2((x1 - x0) * ASPECT, -(y1 - y0)) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/**
 * The sea of a painting coming alive: caustic light in the shallows, foam breaking on the rocks
 * and the swell just off the coast. Two layers baked for that painting (already clipped to its
 * water) take turns, drifting a few pixels: plain textures and opacity, no masks or blend modes
 * for the GPU to redo every frame. `a` carries the breaking foam, `b` the swell.
 */
export function SeaShimmer({ a, b, opacity = 1, dur = 7.5 }: { a: string; b: string; opacity?: number; dur?: number }) {
  return (
    <div aria-hidden className={fx.layer} style={{ opacity }}>
      <div className={clsx(fx.baked, fx.shimmerB)} style={{ backgroundImage: `url(${b})`, "--dur": `${dur}s` } as Vars} />
      <div className={clsx(fx.baked, fx.shimmerA)} style={{ backgroundImage: `url(${a})`, "--dur": `${dur}s` } as Vars} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------

export interface CloudSpec {
  img: 1 | 2 | 3;
  /** width in % of the scene */
  w: number;
  opacity: number;
  dur: number;
  /** negative delay: the cloud is already on its way when the page opens */
  delay: number;
  from: [number, number];
  to: [number, number];
}

/** Soft shadows of clouds drifting over the land and the sea. */
export function CloudShadows({ clouds, wisps = false }: { clouds: CloudSpec[]; wisps?: boolean }) {
  return (
    <div aria-hidden className={clsx(fx.clip, fx.moving)}>
      {clouds.map((c, i) => (
        <div
          key={i}
          className={clsx(fx.track, fx.cloudTrack)}
          style={
            {
              "--dur": `${c.dur}s`,
              "--delay": `${c.delay}s`,
              "--x0": `${c.from[0]}%`,
              "--y0": `${c.from[1]}%`,
              "--x1": `${c.to[0]}%`,
              "--y1": `${c.to[1]}%`,
              transform: `translate3d(${c.from[0]}%, ${c.from[1]}%, 0)`,
            } as Vars
          }
        >
          <div
            className={wisps ? fx.cloudWisp : fx.cloudShadow}
            style={{ "--img": `url(/assets/fx/cloud-${c.img}.webp)`, "--w": `${c.w}%`, "--o": c.opacity } as Vars}
          />
        </div>
      ))}
    </div>
  );
}

export interface GullSpec {
  from: [number, number];
  to: [number, number];
  dur: number;
  delay: number;
  /** width in % of the scene */
  size?: number;
  /** where the ground shadow falls, in % of the bird */
  shadow?: [number, number];
}

/** Seagulls that glide across now and then, flapping a few times and casting a shadow below. */
export function Gulls({ gulls }: { gulls: GullSpec[] }) {
  return (
    <div aria-hidden className={clsx(fx.clip, fx.moving)}>
      {gulls.map((g, i) => (
        <div
          key={i}
          className={clsx(fx.track, fx.gullTrack)}
          style={
            {
              "--dur": `${g.dur}s`,
              "--delay": `${g.delay}s`,
              "--x0": `${g.from[0]}%`,
              "--y0": `${g.from[1]}%`,
              "--x1": `${g.to[0]}%`,
              "--y1": `${g.to[1]}%`,
              opacity: 0,
            } as Vars
          }
        >
          <div
            className={fx.gull}
            style={
              {
                "--size": `${g.size ?? 3}%`,
                "--heading": `${heading(g.from[0], g.from[1], g.to[0], g.to[1]).toFixed(1)}deg`,
                "--flap-delay": `${(i * -1.3).toFixed(1)}s`,
              } as Vars
            }
          >
            <div className={fx.gullShadow} style={{ "--sx": `${g.shadow?.[0] ?? 120}%`, "--sy": `${g.shadow?.[1] ?? 220}%` } as Vars}>
              <i />
            </div>
            <div className={fx.gullBody}>
              <i />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** A warm band of sunlight that sweeps across the scene every so often. */
export function SunGlint({ dur = 19, delay = 5 }: { dur?: number; delay?: number }) {
  return (
    <div aria-hidden className={clsx(fx.clip, fx.moving)}>
      <div className={clsx(fx.track, fx.glintTrack)} style={{ "--dur": `${dur}s`, "--delay": `${delay}s`, opacity: 0 } as Vars}>
        <div className={fx.glint} />
      </div>
    </div>
  );
}

/** Warm light from the top right and a soft darkening at the edges. Static. */
export function Vignette() {
  return <div aria-hidden className={fx.vignette} />;
}

// ---------------------------------------------------------------------------
// Emitters (placed inside a sprite box: x, y and size are % of that box)
// ---------------------------------------------------------------------------

const PUFF_DRIFT = [16, -10, 24, -4];

/** Rising puffs of smoke or dust. `tint` is a CSS filter (sepia for sulfur, warm for dust). */
export function Smoke({
  x,
  y,
  size = 26,
  puffs = 3,
  dur = 4.8,
  rise = -190,
  peak = 0.6,
  grow = 1.5,
  tint,
  offset = 0,
}: {
  x: number;
  y: number;
  size?: number;
  puffs?: number;
  dur?: number;
  rise?: number;
  peak?: number;
  grow?: number;
  tint?: string;
  offset?: number;
}) {
  return (
    <span aria-hidden className={clsx(fx.emitter, fx.moving)} style={{ left: `${x}%`, top: `${y}%`, "--size": `${size}%` } as Vars}>
      {Array.from({ length: puffs }, (_, i) => (
        <span
          key={i}
          className={fx.puff}
          style={
            {
              "--dur": `${dur}s`,
              "--delay": `${(-(dur / puffs) * i - offset).toFixed(2)}s`,
              "--dx": `${PUFF_DRIFT[i % PUFF_DRIFT.length]}%`,
              "--rise": `${rise}%`,
              "--peak": peak,
              "--grow": grow,
              "--tint": tint,
            } as Vars
          }
        >
          <i />
        </span>
      ))}
    </span>
  );
}

/** Flickering campfire glow with a few embers rising. */
export function Fire({ x, y, size = 22, embers = 3 }: { x: number; y: number; size?: number; embers?: number }) {
  return (
    <span aria-hidden className={fx.emitter} style={{ left: `${x}%`, top: `${y}%`, "--size": `${size}%` } as Vars}>
      <span className={clsx(fx.fire, fx.fireSoft)} style={{ inset: "-60%", opacity: 0.45 }} />
      <span className={fx.fire} />
      {Array.from({ length: embers }, (_, i) => (
        <span
          key={i}
          className={clsx(fx.ember, fx.moving)}
          style={{ "--delay": `${(-0.9 * i).toFixed(1)}s`, "--dur": `${2.2 + i * 0.5}s`, "--dx": `${(i - 1) * 140}%` } as Vars}
        />
      ))}
    </span>
  );
}

/** Sparkles that blink on and off at fixed points (crystal glints, gold, a finished building). */
export function Twinkles({
  points,
  size = 30,
  tint,
}: {
  points: { x: number; y: number; delay: number; dur?: number; s?: number }[];
  size?: number;
  tint?: string;
}) {
  return (
    <>
      {points.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(fx.twinkle, fx.moving)}
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              "--s": `${p.s ?? size}%`,
              "--delay": `${p.delay}s`,
              "--dur": `${p.dur ?? 4.2}s`,
              "--tint": tint,
            } as Vars
          }
        >
          <i />
        </span>
      ))}
    </>
  );
}

const SPARK_DIRS: [number, number][] = [
  [-260, -320],
  [220, -380],
  [-120, -460],
  [320, -220],
];

/** A hammer striking: a tiny burst of sparks every second or so. */
export function HammerSparks({ x, y, size = 10, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <span aria-hidden className={clsx(fx.emitter, fx.moving)} style={{ left: `${x}%`, top: `${y}%`, "--size": `${size}%` } as Vars}>
      {SPARK_DIRS.map(([dx, dy], i) => (
        <span key={i} className={fx.spark} style={{ "--dx": `${dx}%`, "--dy": `${dy}%`, "--delay": `${delay}s` } as Vars} />
      ))}
    </span>
  );
}

/** Rings spreading on the water (docked ships, a boat at rest). */
export function Ripples({ count = 2, dur = 3.4, delay = 0, peak = 0.7 }: { count?: number; dur?: number; delay?: number; peak?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(fx.ripple, fx.moving)}
          style={{ "--dur": `${dur}s`, "--delay": `${(delay - (dur / count) * i).toFixed(2)}s`, "--peak": peak } as Vars}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Boats (island)
// ---------------------------------------------------------------------------

/** Two small triremes: one crossing the open sea, one arriving at the eastern lagoon. */
export function IslandBoats() {
  return (
    <div aria-hidden className={clsx(fx.clip, fx.moving)}>
      <div className={clsx(fx.track, fx.boatA)} style={{ "--delay": "-26s", opacity: 0 } as Vars}>
        <div className={fx.boat} style={{ "--size": "6%" } as Vars}>
          <div className={fx.boatTurn} style={{ position: "absolute", inset: 0, rotate: "90deg" }}>
            <span className={fx.wake} />
            <span className={fx.boatHull} />
          </div>
        </div>
      </div>
      <div className={clsx(fx.track, fx.boatB)} style={{ "--delay": "-8s", opacity: 0 } as Vars}>
        <div className={fx.boat} style={{ "--size": "5%" } as Vars}>
          <div style={{ position: "absolute", inset: 0, rotate: `${heading(108, 71, 88, 63).toFixed(1)}deg` }}>
            <span className={fx.wake} />
            <span className={fx.boatHull} style={{ "--delay": "-1.2s" } as Vars} />
          </div>
        </div>
      </div>
    </div>
  );
}
