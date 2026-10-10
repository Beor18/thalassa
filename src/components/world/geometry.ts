// Pure, deterministic world geometry: where every island sits on the painted sea, how routes bend
// and where a ship is along a route at a given progress. No randomness: everything derives from ids.

export interface Pt {
  x: number;
  y: number;
}

export interface IslandLike {
  id: number;
  x: number;
  y: number;
  variant: number;
}

export type Placed<T extends IslandLike> = T & {
  /** center of the island art in world pixels */
  px: number;
  py: number;
  /** rendered art size in world pixels */
  size: number;
  rot: number;
  flip: boolean;
  bobDur: number;
  bobDelay: number;
};

export interface WorldLayout<T extends IslandLike> {
  width: number;
  height: number;
  /** box that contains every island (used for the overview zoom) */
  extent: { x0: number; y0: number; x1: number; y1: number };
  islands: Placed<T>[];
  byId: Map<number, Placed<T>>;
}

/** World pixels per grid cell. Grid neighbours are at least 2 cells apart, so islands never touch. */
export const CELL = 150;
/** Base island art size in world pixels. */
export const ISLAND = 184;
/** Open sea around the archipelago, so the camera never sees the edge of the world. */
export const PAD = 2200;

/** Deterministic hash in [0, 1). */
export function rand(seed: number, salt: number) {
  let t = (Math.imul(seed | 0, 374761393) + Math.imul(salt | 0, 668265263)) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177);
  t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}

export function layoutWorld<T extends IslandLike>(list: T[]): WorldLayout<T> {
  const xs = list.map((i) => i.x);
  const ys = list.map((i) => i.y);
  const minX = list.length ? Math.min(...xs) : 0;
  const minY = list.length ? Math.min(...ys) : 0;
  const cols = list.length ? Math.max(...xs) - minX + 1 : 24;
  const rows = list.length ? Math.max(...ys) - minY + 1 : 24;

  // Reading order (top to bottom, then left to right): lower islands paint over higher ones and Tab follows the map.
  const sorted = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
  const islands = sorted.map((i) => {
    const jx = (rand(i.id, 1) - 0.5) * CELL * 0.24;
    const jy = (rand(i.id, 2) - 0.5) * CELL * 0.24;
    const scale = 0.9 + rand(i.id, 3) * 0.18;
    return {
      ...i,
      px: PAD + (i.x - minX + 0.5) * CELL + jx,
      py: PAD + (i.y - minY + 0.5) * CELL + jy,
      size: Math.round(ISLAND * scale),
      rot: Math.round((rand(i.id, 4) - 0.5) * 8 * 10) / 10,
      flip: i.variant % 2 === 1,
      bobDur: 5 + Math.round(rand(i.id, 5) * 25) / 10,
      bobDelay: -Math.round(rand(i.id, 6) * 60) / 10,
    };
  });

  return {
    width: cols * CELL + PAD * 2,
    height: rows * CELL + PAD * 2,
    extent: { x0: PAD, y0: PAD, x1: PAD + cols * CELL, y1: PAD + rows * CELL },
    islands,
    byId: new Map(islands.map((i) => [i.id, i])),
  };
}

/** Quadratic sea route between two islands, trimmed so it starts and ends at the shore. */
export interface Curve {
  s: Pt;
  c: Pt;
  e: Pt;
}

export function routeCurve(a: Pt & { id: number }, b: Pt & { id: number }, trimA = ISLAND * 0.42, trimB = ISLAND * 0.42): Curve | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < trimA + trimB + 20) return null;
  const ux = dx / len;
  const uy = dy / len;
  const s = { x: a.x + ux * trimA, y: a.y + uy * trimA };
  const e = { x: b.x - ux * trimB, y: b.y - uy * trimB };
  // Bend direction depends on the pair (not on the order), so A→B and B→A share one route.
  const lo = Math.min(a.id, b.id);
  const hi = Math.max(a.id, b.id);
  const sign = (rand(lo * 131 + hi, 7) < 0.5 ? -1 : 1) * (a.id < b.id ? 1 : -1);
  const bend = 0.16 * sign;
  return {
    s,
    e,
    c: { x: (s.x + e.x) / 2 - uy * len * bend, y: (s.y + e.y) / 2 + ux * len * bend },
  };
}

export const curvePath = ({ s, c, e }: Curve) =>
  `M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;

/** Point and heading (radians, 0 = east) at progress t in [0, 1]. */
export function pointOnCurve({ s, c, e }: Curve, t: number): Pt & { angle: number } {
  const u = 1 - t;
  const x = u * u * s.x + 2 * u * t * c.x + t * t * e.x;
  const y = u * u * s.y + 2 * u * t * c.y + t * t * e.y;
  const dx = 2 * u * (c.x - s.x) + 2 * t * (e.x - c.x);
  const dy = 2 * u * (c.y - s.y) + 2 * t * (e.y - c.y);
  return { x, y, angle: Math.atan2(dy, dx) };
}

/** Ships sailing between two cities on the same island circle its coast. */
export function pointOnLoop(center: Pt, size: number, t: number): Pt & { angle: number } {
  const a = t * Math.PI * 2 - Math.PI / 2;
  const rx = size * 0.62;
  const ry = size * 0.5;
  return {
    x: center.x + Math.cos(a) * rx,
    y: center.y + Math.sin(a) * ry,
    angle: Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx),
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
