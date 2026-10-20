import type { ReactNode } from "react";
import {
  TOWER_SPRITE_WIDTH,
  WALL_GATES,
  WALL_ORIGIN,
  WALL_RUNS,
  WALL_TOWER_SPRITES,
  WALL_TOWERS,
  WALL_VIEW,
  wallTier,
  type Pt,
  type TowerSprite,
  type TowerStyle,
  type WallMaterial,
  type WallTier,
} from "./city-wall-plan";

/*
  The city wall ring as one static SVG in scene pixels (see city-wall-plan.ts). Nothing in here
  animates: inline SVG children repaint the whole drawing when they move, so flames, flags and the
  sheen live in HTML layers on top (city-wall.tsx). Towers are their own elements (a painted sprite
  or TowerArt) so they stack with the building plots by depth.

  Projection: height goes straight up the screen. A wall is its ground line swept up by `h`: the
  faces that look toward the viewer are shaded quads, the walkway is a stroke of the ground line
  moved up, and merlons are markers standing on the outer edge.
*/

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;
const line = (ps: readonly Pt[]) => (ps.length ? `M${ps.map(pt).join("L")}` : "");
const poly = (ps: readonly Pt[]) => `${line(ps)}Z`;
const up = (p: Pt, h: number): Pt => [p[0], p[1] - h];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const unit = (a: Pt, b: Pt): Pt => {
  const l = dist(a, b) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
/** Right-hand normal: the runs keep the city on their left, so this points out of the city. */
const outward = (d: Pt): Pt => [-d[1], d[0]];

/** Sun from the front left, like on the building sprites. */
const LIGHT: Pt = [-0.55, 0.835];
/** Vertical squash of circles (tower tops, roof rims). */
const ELLIPSE = 0.45;

/** Offset of a joint between two segments with normals n1 and n2, so both edges meet. */
function miter(n1: Pt, n2: Pt, d: number): Pt {
  const m = unit([0, 0], add(n1, n2));
  return [(m[0] * d) / Math.max(0.5, dot(m, n1)), (m[1] * d) / Math.max(0.5, dot(m, n1))];
}

/** The polyline moved `d` toward the outside of the city (negative: toward the inside). */
function offsetLine(points: readonly Pt[], d: number): Pt[] {
  const normals = points.slice(1).map((p, i) => outward(unit(points[i], p)));
  return points.map((p, i) => {
    const a = normals[i - 1];
    const b = normals[i];
    return add(p, a && b ? miter(a, b, d) : [(a ?? b)[0] * d, (a ?? b)[1] * d]);
  });
}

/** Points every `step` along a polyline. */
function resample(points: readonly Pt[], step: number, start = step / 2): Pt[] {
  const out: Pt[] = [];
  let t = start;
  for (let i = 0; i < points.length - 1; i++) {
    const l = dist(points[i], points[i + 1]);
    for (; t <= l; t += step) out.push(lerp(points[i], points[i + 1], t / l));
    t -= l;
  }
  return out;
}

interface Face {
  quad: Pt[];
  /** bottom edge of the face, on the ground */
  edge: [Pt, Pt];
  /** 0 (in shade) .. 1 (facing the sun) */
  shade: number;
}

/**
 * The faces of a wall that look toward the viewer: per segment, the side whose normal points down
 * the screen. Joints between faces on the same side are mitred so the stone courses run on.
 */
function wallFaces(points: readonly Pt[], w: number, h: number): Face[] {
  const normals = points.slice(1).map((p, i) => outward(unit(points[i], p)));
  const sides = normals.map((n) => (Math.abs(n[1]) < 0.1 ? 0 : Math.sign(n[1])));
  const faces: Face[] = [];
  normals.forEach((n, i) => {
    const side = sides[i];
    if (!side) return;
    const fn: Pt = [n[0] * side, n[1] * side];
    const corner = (j: number): Pt =>
      sides[j] === side ? miter(fn, [normals[j][0] * side, normals[j][1] * side], w / 2) : [(fn[0] * w) / 2, (fn[1] * w) / 2];
    const a = add(points[i], corner(i - 1));
    const b = add(points[i + 1], corner(i + 1));
    const quad = [a, b, up(b, h), up(a, h)];
    // Same winding everywhere, so the union clips without holes.
    const area = quad.reduce((s, p, k) => s + p[0] * quad[(k + 1) % 4][1] - quad[(k + 1) % 4][0] * p[1], 0);
    faces.push({ quad: area < 0 ? quad.reverse() : quad, edge: [a, b], shade: Math.min(1, Math.max(0.3, 0.5 + 0.5 * dot(fn, LIGHT))) });
  });
  return faces;
}

// ---------------------------------------------------------------------------
// Layout for a wall level
// ---------------------------------------------------------------------------

export interface TowerPlace {
  id: string;
  x: number;
  y: number;
  r: number;
  height: number;
  style: TowerStyle;
  banner: boolean;
  /** the element's box in scene px: the sprite, or room around the SVG tower */
  box: { x: number; y: number; w: number; h: number };
  /** stacking like the plots (10 + y% / 2), so a tower in front of a building covers it */
  z: number;
  /** painted tower, or null for the SVG one */
  sprite: TowerSprite | null;
  /** foot of a waving flag pole, in scene px */
  crown: Pt | null;
  /** where a flame burns, and its glow size (scene px) */
  fire: Pt | null;
  fireSize: number;
  /** 0 = closest to the gatehouse: the rise ripples outwards */
  rank: number;
}

export interface WallLayout {
  level: number;
  tier: WallTier;
  /** wall height and thickness */
  h: number;
  w: number;
  runs: { id: string; points: Pt[]; faces: Face[] }[];
  /** back to front */
  towers: TowerPlace[];
  /** fires standing on the parapet */
  lights: Pt[];
  gates: { id: string; at: Pt; angle: number; width: number }[];
}

const inView = (p: Pt, margin = 0) => p[0] >= -margin && p[0] <= WALL_VIEW.w + margin && p[1] >= -margin && p[1] <= WALL_VIEW.h + margin;

export function wallLayout(level: number): WallLayout | null {
  const tier = wallTier(level);
  if (!tier) return null;
  const step = level - tier.from;
  const h = tier.height + step * tier.grow;
  const w = tier.thickness;
  const sprite = WALL_TOWER_SPRITES[tier.id];
  const painted = sprite?.available ? sprite : null;

  const runs = WALL_RUNS.filter((r) => level >= r.from).map((r) => ({ id: r.id, points: [...r.points], faces: wallFaces(r.points, w, h) }));
  const spots = WALL_TOWERS.filter((s) => level >= s.from);
  const ranked = [...spots].sort((a, b) => dist(a.at, WALL_ORIGIN) - dist(b.at, WALL_ORIGIN));

  const towers = spots
    .map((s): TowerPlace => {
      const [x, y] = s.at;
      const r = tier.tower.radius * (s.big ? 1.14 : 1);
      const height = (tier.tower.height + step * tier.grow * 1.6) * (s.big ? 1.1 : 1);
      const beacon = s.beacon != null && level >= s.beacon;
      const style = beacon && (tier.tower.style === "cone" || tier.tower.style === "gilded") ? "brazier" : tier.tower.style;
      const banner = tier.banners === "all" || (tier.banners === "some" && Boolean(s.banner));
      const base = { id: s.id, x, y, r, height, style, banner, z: 10 + Math.round((y / WALL_VIEW.h) * 50), rank: ranked.indexOf(s) };
      if (painted) {
        const size = TOWER_SPRITE_WIDTH * painted.scale * (s.big ? 1.12 : 1);
        const at = (f: Pt): Pt => [x + (f[0] - painted.anchor[0]) * size, y + (f[1] - painted.anchor[1]) * size];
        return {
          ...base,
          sprite: painted,
          box: { x: x - painted.anchor[0] * size, y: y - painted.anchor[1] * size, w: size, h: size },
          crown: tier.flags && painted.crown ? at(painted.crown) : null,
          fire: painted.fire ? at(painted.fire) : null,
          fireSize: ((painted.fireSize ?? 15) / 100) * size,
        };
      }
      const top = towerTop(style, x, y, r, height, tier.tower.roof);
      const above = height + Math.max(tier.tower.roof, 12) + 24;
      return {
        ...base,
        sprite: null,
        box: { x: x - r * 2.2, y: y - above, w: r * 4.4, h: above + r * 0.6 },
        crown: tier.flags ? top.crown : null,
        fire: style === "brazier" ? top.fire : null,
        fireSize: 20,
      };
    })
    .sort((a, b) => a.y - b.y);

  const lights = tier.lights
    ? runs
        .flatMap((run) => resample(offsetLine(run.points, w * 0.3).map((p) => up(p, h)), tier.lights!.every))
        .filter((p) => p[1] > 30 && inView(p) && towers.every((t) => dist(p, [t.x, t.y - h]) > t.r + 26))
    : [];

  const gates = WALL_GATES.flatMap((g) => {
    for (const run of runs) {
      for (let i = 0; i < run.points.length - 1; i++) {
        const a = run.points[i];
        const b = run.points[i + 1];
        if (Math.abs(dist(a, g.at) + dist(g.at, b) - dist(a, b)) > 2) continue;
        const d = unit(a, b);
        const n = outward(d);
        const side = n[1] < 0 ? -1 : 1;
        return [{ id: g.id, at: add(g.at, n, (side * w) / 2), angle: (Math.atan2(d[1] * side, d[0] * side) * 180) / Math.PI, width: g.width }];
      }
    }
    return [];
  });

  return { level, tier, h, w, runs, towers, lights, gates };
}

/** The wall bands as a standalone black SVG, for masking the sheen to the stone. */
export function wallSilhouette({ runs, h, w }: WallLayout): string {
  const paths = runs.map(
    (run) =>
      `<path d="${run.faces.map((f) => poly(f.quad)).join("")}"/>` +
      `<path d="${line(run.points.map((p) => up(p, h)))}" fill="none" stroke="#000" stroke-width="${w + 4}" stroke-linejoin="round"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WALL_VIEW.w} ${WALL_VIEW.h}">${paths.join("")}</svg>`;
}

/** Flag pole foot and flame point of an SVG tower (kept in step with the drawings below). */
function towerTop(style: TowerStyle, x: number, y: number, r: number, H: number, roof: number): { crown: Pt; fire: Pt } {
  switch (style) {
    case "watch":
      return { crown: [x, y - H * 0.84 - roof], fire: [x, y - H * 0.84] };
    case "square":
      return { crown: [x, y - H], fire: [x, y - H - 4] };
    case "brazier":
      return { crown: [x + r * 0.72, y - H - 6], fire: [x, y - H - 17] };
    default:
      return { crown: [x, y - H - 4 - roof], fire: [x, y - H - 4 - roof] };
  }
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

interface Stone {
  top: string;
  light: string;
  dark: string;
  joint: string;
  coping: string;
  /** stone course height (0: timber) */
  course: number;
}

const PALETTE: Record<WallMaterial, Stone> = {
  wood: { top: "#b4824a", light: "#a06f3a", dark: "#5c3a1a", joint: "#2e1c0b", coping: "#d8a96a", course: 0 },
  sandstone: { top: "#efdcb2", light: "#dcc193", dark: "#987b53", joint: "#6a5236", coping: "#f9ecd2", course: 4.6 },
  limestone: { top: "#f6eedb", light: "#e8dbbd", dark: "#a8957a", joint: "#7a6951", coping: "#fffaf0", course: 5.2 },
  bronze: { top: "#f4ead3", light: "#e6d6b3", dark: "#a38f70", joint: "#76634c", coping: "#c98d3e", course: 5.4 },
  marble: { top: "#fefcf8", light: "#f6f2ea", dark: "#c3baab", joint: "#a39883", coping: "#e8b93f", course: 6 },
};

const GOLD = ["#8a5f12", "#e3b341", "#ffe7a3", "#c9962e"] as const;
const BRONZE = ["#5c3a10", "#a8712a", "#d39a45", "#7a4f18"] as const;
const TERRACOTTA = ["#6e2a12", "#b9582c", "#de7d4c", "#9c4120"] as const;

const merlonWidth = (w: number) => Math.max(4, w * 0.6);

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Height of the flame core above a parapet light's foot, where its glow goes. */
export const LIGHT_FLAME = 11;

/** The wall bands, gates and parapet lights. Towers are separate elements (TowerArt / sprites). */
export function WallArt({ layout, className }: { layout: WallLayout; className?: string }) {
  const { tier, h, w } = layout;
  const pal = PALETTE[tier.material];
  return (
    <svg viewBox={`0 0 ${WALL_VIEW.w} ${WALL_VIEW.h}`} className={className} aria-hidden focusable="false">
      <Defs layout={layout} pal={pal} />
      {layout.runs.map((run) => (
        <Run key={run.id} id={run.id} points={run.points} faces={run.faces} h={h} w={w} pal={pal} material={tier.material} />
      ))}
      {layout.gates.map((g) => (
        <Gate key={g.id} at={g.at} angle={g.angle} width={g.width} h={h} pal={pal} material={tier.material} />
      ))}
      {layout.lights.map(([x, y], i) => (
        <g key={i}>
          {tier.lights?.kind === "brazier" ? (
            <>
              <path d={`M${pt([x - 3, y])}L${pt([x, y - 5])}L${pt([x + 3, y])}M${pt([x, y])}V${r1(y - 5)}`} fill="none" stroke={BRONZE[0]} strokeWidth={1.2} />
              <path d={`M${pt([x - 4.5, y - 5.5])}A4.5 2.6 0 0 0 ${pt([x + 4.5, y - 5.5])}Z`} fill="url(#cw-bronze)" />
            </>
          ) : (
            <path d={`M${pt([x, y])}v-5m-2 0h4l-.8 2.2h-2.4z`} fill={GOLD[3]} stroke={GOLD[0]} strokeWidth={1} strokeLinejoin="round" />
          )}
          <Flame x={x} y={y - 5.5} size={tier.lights?.kind === "brazier" ? 1 : 0.8} />
        </g>
      ))}
    </svg>
  );
}

function Flame({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const s = (n: number) => r1(n * size);
  return (
    <path
      d={`M${pt([x - s(3), y])}c0-${s(5)} ${s(2.5)}-${s(6)} ${s(3)}-${s(11)}c.5 ${s(5)} ${s(3)} ${s(6)} ${s(3)} ${s(11)}z`}
      fill="url(#cw-flame)"
    />
  );
}

/** Towers spring up one after the other when the wall was just upgraded (see city-wall-rise.tsx). */
export const towerRise =
  "[transform-origin:50%_100%] motion-safe:group-data-[rise]/wall:animate-[wall-tower-rise_0.9s_var(--ease-out-quint)_var(--rise-delay)_both]";
export const riseDelay = (rank: number) => `${(0.3 + rank * 0.07).toFixed(2)}s`;

/** One SVG tower in its own small drawing (scene coordinates), so it can stack with the plots. */
export function TowerArt({ t, layout, className }: { t: TowerPlace; layout: WallLayout; className?: string }) {
  const { box } = t;
  return (
    <svg viewBox={`${r1(box.x)} ${r1(box.y)} ${r1(box.w)} ${r1(box.h)}`} className={className} overflow="visible" aria-hidden focusable="false">
      <Tower t={t} pal={PALETTE[layout.tier.material]} tier={layout.tier} />
    </svg>
  );
}

function stops(colors: readonly string[], at: readonly number[]) {
  return colors.map((c, i) => <stop key={i} offset={at[i]} stopColor={c} />);
}

function Defs({ layout, pal }: { layout: WallLayout; pal: Stone }) {
  const { tier, h, w } = layout;
  const roof = tier.tower.style === "gilded" ? GOLD : TERRACOTTA;
  const mw = merlonWidth(w);
  const mh = Math.max(4, h * 0.2);
  const cap = Math.max(1.6, w * 0.22);
  return (
    <defs>
      <linearGradient id="cw-cyl">
        {stops([mix(pal.dark, pal.light, 0.6), pal.light, mix(pal.light, pal.dark, 0.3), pal.dark, mix(pal.dark, pal.joint, 0.5)], [0, 0.22, 0.5, 0.85, 1])}
      </linearGradient>
      <linearGradient id="cw-roof">{stops([roof[3], roof[2], roof[1], roof[0]], [0, 0.3, 0.62, 1])}</linearGradient>
      <linearGradient id="cw-bronze">{stops([BRONZE[3], BRONZE[2], BRONZE[1], BRONZE[0]], [0, 0.3, 0.65, 1])}</linearGradient>
      <linearGradient id="cw-gold">{stops([GOLD[3], GOLD[2], GOLD[1], GOLD[0]], [0, 0.3, 0.6, 1])}</linearGradient>
      <linearGradient id="cw-banner" x2="0" y2="1">
        {stops(["#2c55ad", "#1d3f8f", "#132a63"], [0, 0.5, 1])}
      </linearGradient>
      <linearGradient id="cw-flame" x2="0" y2="1">
        {stops(["#e2531f", "#ffb347", "#fff3c4"], [0, 0.45, 1])}
      </linearGradient>
      <linearGradient id="cw-gate" x2="0" y2="1">
        {stops(["#1d140b", "#2a1e12", "#6b5a40"], [0, 0.6, 1])}
      </linearGradient>
      <radialGradient id="cw-shade">
        <stop offset="0" stopColor="#24160a" stopOpacity={0.42} />
        <stop offset="1" stopColor="#24160a" stopOpacity={0} />
      </radialGradient>
      {pal.course === 0 && (
        <marker id="cw-stake" markerUnits="userSpaceOnUse" markerWidth={1} markerHeight={1} overflow="visible">
          <path d="M-2.6 0V-2.6L0-5.6V0z" fill={pal.coping} />
          <path d="M0 0V-5.6L2.6-2.6V0z" fill={pal.dark} />
        </marker>
      )}
      {pal.course > 0 && (
        <marker id="cw-merlon" markerUnits="userSpaceOnUse" markerWidth={1} markerHeight={1} overflow="visible">
          <rect x={-mw / 2} y={-mh} width={mw} height={mh} fill={pal.light} />
          <rect x={mw * 0.2} y={-mh} width={mw * 0.3} height={mh} fill={pal.dark} opacity={0.45} />
          <rect x={-mw / 2} y={-mh - cap} width={mw} height={cap} fill={tier.material === "marble" ? GOLD[2] : pal.top} />
        </marker>
      )}
      {layout.runs.map((run) => (
        <g key={run.id}>
          <path id={`cw-edge-${run.id}`} fill="none" d={run.faces.map((f) => line(f.edge)).join("")} />
          <clipPath id={`cw-face-${run.id}`}>
            <path d={run.faces.map((f) => poly(f.quad)).join("")} />
          </clipPath>
        </g>
      ))}
    </defs>
  );
}

function Run({
  id,
  points,
  faces,
  h,
  w,
  pal,
  material,
}: {
  id: string;
  points: Pt[];
  faces: Face[];
  h: number;
  w: number;
  pal: Stone;
  material: WallMaterial;
}) {
  const edge = `#cw-edge-${id}`;
  const shadow = line(points.map((p) => add(p, [h * 0.32, h * 0.22])));
  const wood = pal.course === 0;
  const courses = wood ? 0 : Math.floor((h - 1.5) / pal.course);
  // Pointed stakes on the palisade, merlons on the outer edge of stone walls; back ones first.
  const crest = (wood ? resample(points.map((p) => up(p, h)), 5) : resample(offsetLine(points, w * 0.3).map((p) => up(p, h)), merlonWidth(w) * 1.8))
    .filter((p) => inView(p, 10))
    .sort((a, b) => a[1] - b[1]);
  const marker = wood ? "url(#cw-stake)" : "url(#cw-merlon)";

  return (
    <g>
      {/* Soft ground shadow toward the lower right */}
      <path d={shadow} fill="none" stroke="#2a1a0a" strokeOpacity={0.12} strokeWidth={w + h * 0.95} strokeLinejoin="round" />
      <path d={shadow} fill="none" stroke="#2a1a0a" strokeOpacity={0.16} strokeWidth={w + h * 0.4} strokeLinejoin="round" />

      <path d={line(points)} fill="none" stroke={pal.dark} strokeWidth={w} strokeLinejoin="round" />
      {faces.map((f, i) => (
        <path key={i} d={poly(f.quad)} fill={mix(pal.dark, pal.light, 0.15 + 0.75 * f.shade)} />
      ))}

      <g clipPath={`url(#cw-face-${id})`}>
        {wood ? (
          <>
            {/* Logs: dark seams and a lit edge on each stake, two binding rails */}
            <use href={edge} transform={`translate(0 ${-h / 2})`} stroke={pal.joint} strokeOpacity={0.55} strokeWidth={h} strokeDasharray="0.8 3" />
            <use href={edge} transform={`translate(0 ${-h / 2})`} stroke={pal.coping} strokeOpacity={0.3} strokeWidth={h} strokeDasharray="1 2.8" strokeDashoffset={-1} />
            <use href={edge} transform={`translate(0 ${-h * 0.7})`} stroke={pal.dark} strokeWidth={1.5} />
            <use href={edge} transform={`translate(0 ${-h * 0.24})`} stroke={pal.dark} strokeWidth={1.5} />
          </>
        ) : (
          <>
            {/* Ashlar in running bond: lit block faces, head joints, bed joints; rain streaks; damp at the foot */}
            {Array.from({ length: courses }, (_, k) => (
              <g key={k} transform={`translate(0 ${r1(-(k + 0.5) * pal.course)})`}>
                <use href={edge} stroke="#fff" strokeOpacity={0.12} strokeWidth={pal.course - 1.6} strokeDasharray={`${r1(pal.course * 2.2 - 0.9)} 0.9`} strokeDashoffset={k % 2 ? r1(pal.course * 1.1) : 0} />
                <use href={edge} stroke={pal.joint} strokeOpacity={0.42} strokeWidth={pal.course} strokeDasharray={`0.7 ${r1(pal.course * 2.2 - 0.7)}`} strokeDashoffset={k % 2 ? r1(pal.course * 1.1) : 0} />
                <use href={edge} transform={`translate(0 ${r1(pal.course / 2)})`} stroke={pal.joint} strokeOpacity={0.38} strokeWidth={0.7} />
              </g>
            ))}
            <use href={edge} transform="translate(0 -3)" stroke={pal.joint} strokeOpacity={0.2} strokeWidth={6} />
            <use
              href={edge}
              transform={`translate(0 ${r1(-h / 2)})`}
              stroke={pal.joint}
              strokeOpacity={0.08}
              strokeWidth={h}
              strokeDasharray="9 14 4 21 6 11"
            />
          </>
        )}
      </g>
      <use href={edge} stroke={pal.joint} strokeOpacity={0.4} strokeWidth={2.4} />

      {/* Walkway, the shaded inner edge behind the parapet, the lit coping */}
      <path d={line(points.map((p) => up(p, h)))} fill="none" stroke={wood ? pal.top : mix(pal.top, pal.dark, 0.28)} strokeWidth={w} strokeLinejoin="round" />
      {!wood && (
        <path
          d={line(offsetLine(points, -w * 0.2).map((p) => up(p, h)))}
          fill="none"
          stroke={pal.joint}
          strokeOpacity={0.16}
          strokeWidth={w * 0.4}
          strokeLinejoin="round"
        />
      )}
      <use href={edge} transform={`translate(0 ${r1(-h)})`} stroke={pal.coping} strokeWidth={material === "bronze" || material === "marble" ? 2 : 1.3} />
      {material === "marble" && (
        <use href={edge} transform={`translate(0 ${r1(-h + 4.5)})`} stroke={GOLD[1]} strokeOpacity={0.85} strokeWidth={0.9} />
      )}

      <path d={line(crest)} fill="none" stroke="none" markerStart={marker} markerMid={marker} markerEnd={marker} />
    </g>
  );
}

function Gate({ at, angle, width, h, pal, material }: { at: Pt; angle: number; width: number; h: number; pal: Stone; material: WallMaterial }) {
  const tall = Math.min(h * 0.8, width * 1.25);
  const rise = Math.min(width / 2, tall * 0.55);
  const arch = `M${-width / 2} 0V${r1(-(tall - rise))}A${width / 2} ${r1(rise)} 0 0 1 ${width / 2} ${r1(-(tall - rise))}V0Z`;
  const metal = material === "marble" ? "url(#cw-gold)" : "url(#cw-bronze)";
  return (
    <g transform={`translate(${pt(at)}) skewY(${r1(angle)})`}>
      {material === "wood" ? (
        <>
          <path d={arch} fill="#4a2d12" />
          <path d={`M0 0V${r1(-tall)}M${-width / 4} 0V${r1(-tall * 0.9)}M${width / 4} 0V${r1(-tall * 0.9)}`} stroke="#2a1806" strokeWidth={0.7} />
          <path d={`M${-width / 2} ${r1(-tall * 0.3)}H${width / 2}M${-width / 2} ${r1(-tall * 0.7)}H${width / 2}`} stroke="#22170d" strokeWidth={1.1} />
        </>
      ) : (
        <>
          <path d={arch} fill="url(#cw-gate)" />
          {(material === "bronze" || material === "marble") && (
            <path
              d={`M${-width / 2 + 2} ${r1(-tall + rise * 0.6)}H${width / 2 - 2}${Array.from({ length: 5 }, (_, i) => `M${r1(-width / 2 + 2.5 + i * ((width - 5) / 4))} ${r1(-tall + rise * 0.3)}v${r1(rise * 0.75)}`).join("")}`}
              stroke={metal}
              strokeWidth={1}
            />
          )}
          <path d={arch.replace(/V0Z$/, "V0")} fill="none" stroke={material === "marble" ? GOLD[1] : pal.coping} strokeWidth={2} />
          <path d={`M-1.6 ${r1(-tall - 1)}h3.2l-.6 3.4h-2z`} fill={material === "marble" ? GOLD[2] : pal.top} />
        </>
      )}
    </g>
  );
}

function Tower({ t, pal, tier }: { t: TowerPlace; pal: Stone; tier: WallTier }) {
  const { x, y, r } = t;
  return (
    <>
      <ellipse cx={x + r * 0.45} cy={y + r * 0.18} rx={r * 1.6} ry={r * 0.6} fill="url(#cw-shade)" />
      {t.style === "watch" ? (
        <WatchTower t={t} roof={tier.tower.roof} />
      ) : t.style === "square" ? (
        <SquareTower t={t} pal={pal} />
      ) : (
        <RoundTower t={t} pal={pal} roof={tier.tower.roof} />
      )}
    </>
  );
}

/** Timber stilts, a plank cabin and a pyramid roof. */
function WatchTower({ t: { x, y, r, height: H }, roof }: { t: TowerPlace; roof: number }) {
  const floor = y - H * 0.6;
  const top = y - H * 0.84;
  const planks = Array.from({ length: Math.floor((2 * r) / 3.2) }, (_, i) => `M${r1(x - r + 1.6 + i * 3.2)} ${r1(top)}V${r1(floor)}`).join("");
  return (
    <>
      <path
        d={`M${pt([x - r * 0.5, y - r * 0.35])}L${pt([x - r * 0.46, floor])}M${pt([x + r * 0.5, y - r * 0.35])}L${pt([x + r * 0.46, floor])}`}
        stroke="#3b2510"
        strokeWidth={1.8}
      />
      <path
        d={`M${pt([x - r * 0.8, y - 2])}L${pt([x + r * 0.72, floor + 3])}M${pt([x + r * 0.8, y - 2])}L${pt([x - r * 0.72, floor + 3])}M${pt([x - r * 0.78, y - H * 0.3])}H${r1(x + r * 0.78)}`}
        stroke="#5a3a1a"
        strokeWidth={1.2}
      />
      <path d={`M${pt([x - r * 0.82, y])}L${pt([x - r * 0.74, floor])}M${pt([x + r * 0.82, y])}L${pt([x + r * 0.74, floor])}`} stroke="#4e3117" strokeWidth={2.6} />
      <rect x={r1(x - r)} y={r1(top)} width={r1(2 * r)} height={r1(floor - top)} fill="#9c6b37" />
      <path d={planks} stroke="#5b3a1a" strokeOpacity={0.5} strokeWidth={0.6} />
      <rect x={r1(x - r * 0.5)} y={r1(top + (floor - top) * 0.25)} width={r1(r)} height={r1((floor - top) * 0.32)} fill="#24160a" />
      <rect x={r1(x - r - 1.5)} y={r1(floor - 1.3)} width={r1(2 * r + 3)} height={2.6} fill="#4e3117" />
      <path d={poly([[x - r * 1.3, top + 1], [x, top - roof], [x + r * 0.18, top + 2.6]])} fill="#cf9e5e" />
      <path d={poly([[x + r * 0.18, top + 2.6], [x, top - roof], [x + r * 1.3, top + 1]])} fill="#8d5e30" />
      <path d={`M${pt([x - r * 1.3, top + 1])}L${pt([x + r * 0.18, top + 2.6])}L${pt([x + r * 1.3, top + 1])}`} fill="none" stroke="#5b3a1a" strokeWidth={0.9} />
    </>
  );
}

/** A parapet face standing on edge a-b, `ph` high, with `n` crenels cut `dip` deep. */
function crenels(a: Pt, b: Pt, n: number, ph: number, dip: number): Pt[] {
  const parts = 2 * n + 1;
  const out: Pt[] = [a];
  for (let i = 0; i < parts; i++) {
    const hh = i % 2 ? ph - dip : ph;
    out.push(up(lerp(a, b, i / parts), hh), up(lerp(a, b, (i + 1) / parts), hh));
  }
  out.push(b);
  return out;
}

/** Square stone tower drawn like the building sprites: two faces and a crenellated top. */
function SquareTower({ t: { x, y, r, height: H }, pal }: { t: TowerPlace; pal: Stone }) {
  const L: Pt = [x - r, y];
  const F: Pt = [x, y + r * 0.5];
  const R: Pt = [x + r, y];
  const B: Pt = [x, y - r * 0.5];
  const ph = 6;
  const lit = mix(pal.dark, pal.light, 0.97);
  const shaded = mix(pal.dark, pal.light, 0.5);
  const lines = Array.from({ length: Math.floor(H / pal.course) - 1 }, (_, i) => {
    const k = (i + 1) * pal.course;
    return `M${pt(up(L, k))}L${pt(up(F, k))}L${pt(up(R, k))}`;
  }).join("");
  const slit = up(lerp(L, F, 0.5), H * 0.55);
  return (
    <>
      <path d={poly([L, F, up(F, H), up(L, H)])} fill={lit} />
      <path d={poly([F, R, up(R, H), up(F, H)])} fill={shaded} />
      <path d={lines} fill="none" stroke={pal.joint} strokeOpacity={0.3} strokeWidth={0.7} />
      <path d={`M${pt(slit)}v-8`} stroke="#2a1e12" strokeWidth={1.8} strokeLinecap="round" />
      <path d={poly([up(L, H), up(F, H), up(R, H), up(B, H)])} fill={mix(pal.dark, pal.top, 0.45)} />
      <path d={poly([up(L, H), up(B, H), up(R, H), up(R, H + ph), up(B, H + ph), up(L, H + ph)])} fill={mix(pal.dark, pal.light, 0.72)} />
      <path d={line([up(L, H + ph), up(B, H + ph), up(R, H + ph)])} fill="none" stroke={pal.top} strokeWidth={1.4} />
      <path d={poly(crenels(up(L, H), up(F, H), 2, ph, 3))} fill={lit} />
      <path d={poly(crenels(up(F, H), up(R, H), 2, ph, 3))} fill={shaded} />
      <path d={line([up(L, H), up(F, H), up(R, H)])} fill="none" stroke={pal.coping} strokeWidth={1.1} />
      <path d={line([L, F, R])} fill="none" stroke={pal.joint} strokeOpacity={0.4} strokeWidth={2} />
    </>
  );
}

/** Front half of an ellipse (left to right through the bottom) as points. */
function frontArc(cx: number, cy: number, rx: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI - (Math.PI * i) / n;
    return [cx + rx * Math.cos(a), cy + rx * ELLIPSE * Math.sin(a)];
  });
}

/** Round tower: a lit cylinder; a terracotta or gilded cone, or an open crenellated top with a brazier. */
function RoundTower({ t, pal, roof }: { t: TowerPlace; pal: Stone; roof: number }) {
  const { x, y, r, height: H, style } = t;
  const e = ELLIPSE;
  const cyl = (rad: number, y0: number, y1: number) => `M${pt([x - rad, y1])}L${pt([x - rad, y0])}A${r1(rad)} ${r1(rad * e)} 0 0 0 ${pt([x + rad, y0])}L${pt([x + rad, y1])}Z`;
  const arc = (rad: number, cy: number) => `M${pt([x - rad, cy])}A${r1(rad)} ${r1(rad * e)} 0 0 0 ${pt([x + rad, cy])}`;
  const courses = Array.from({ length: Math.floor(H / pal.course) - 1 }, (_, i) => arc(r, y - (i + 1) * pal.course)).join("");
  const gilded = style === "gilded";
  const metal = gilded ? "url(#cw-gold)" : "url(#cw-bronze)";

  let crown: ReactNode;
  if (style === "brazier") {
    const rp = r + 2.2;
    const ph = 7;
    const base = frontArc(x, y - H, rp, 9);
    const notched = base.flatMap((p, i): Pt[] => {
      if (i === base.length - 1) return [];
      const hh = i % 2 ? ph - 3 : ph;
      return [up(p, hh), up(base[i + 1], hh)];
    });
    const by = y - H - ph - 3;
    crown = (
      <>
        <path d={arc(r, y - H)} fill="none" stroke={pal.joint} strokeOpacity={0.45} strokeWidth={1.8} />
        <ellipse cx={x} cy={r1(y - H - ph)} rx={r1(rp)} ry={r1(rp * e)} fill={pal.top} />
        <ellipse cx={x} cy={r1(y - H - ph + 1.2)} rx={r1(rp - 2.6)} ry={r1((rp - 2.6) * e)} fill={mix(pal.dark, pal.joint, 0.4)} />
        <path d={poly([...base, ...notched.reverse()])} fill="url(#cw-cyl)" />
        <path d={line(base)} fill="none" stroke={gilded ? GOLD[1] : "url(#cw-bronze)"} strokeWidth={2.2} />
        <path d={`M${pt([x, y - H - ph + 1])}V${r1(by + 1)}`} stroke={BRONZE[0]} strokeWidth={2} />
        <path d={`M${pt([x - 5.5, by])}A5.5 3 0 0 0 ${pt([x + 5.5, by])}Z`} fill={metal} />
        <ellipse cx={x} cy={r1(by)} rx={5.5} ry={1.5} fill="#3a2108" />
        <path d={`M${pt([x - 3, by])}C${pt([x - 3, by - 5])} ${pt([x - 0.5, by - 6])} ${pt([x, by - 11])}C${pt([x + 0.5, by - 6])} ${pt([x + 3, by - 5])} ${pt([x + 3, by])}Z`} fill="url(#cw-flame)" />
      </>
    );
  } else {
    const rc = r + 2.2;
    const rr = r + 4.5;
    const yb = y - H - 4;
    const apex: Pt = [x, yb - roof];
    const ribs = [0.16, 0.33, 0.5, 0.67, 0.84].map((f) => {
      const a = Math.PI * f;
      return `M${pt(apex)}L${pt([x + rr * Math.cos(a), yb + rr * e * Math.sin(a)])}`;
    });
    const rings = [0.34, 0.66].map((s) => arc(rr * (1 - s), yb - roof * s));
    crown = (
      <>
        <path d={cyl(rc, y - H, y - H - 4)} fill="url(#cw-cyl)" />
        <path d={arc(r, y - H + 0.5)} fill="none" stroke={pal.joint} strokeOpacity={0.45} strokeWidth={1.8} />
        {gilded && <path d={arc(rc, y - H - 2)} fill="none" stroke={GOLD[1]} strokeWidth={1.6} />}
        <path d={arc(rr - 0.5, yb + 2)} fill="none" stroke="#24160a" strokeOpacity={0.35} strokeWidth={2.2} />
        <path d={`M${pt([x - rr, yb])}L${pt(apex)}L${pt([x + rr, yb])}A${r1(rr)} ${r1(rr * e)} 0 0 1 ${pt([x - rr, yb])}Z`} fill="url(#cw-roof)" />
        <path d={[...ribs, ...rings].join("")} fill="none" stroke="#3a1a0a" strokeOpacity={gilded ? 0.18 : 0.28} strokeWidth={0.7} />
        <path d={`M${pt(apex)}v-7`} stroke={gilded ? GOLD[1] : BRONZE[1]} strokeWidth={1.3} />
        <circle cx={x} cy={r1(apex[1] - 7.5)} r={1.7} fill={gilded ? GOLD[2] : BRONZE[2]} />
      </>
    );
  }

  return (
    <>
      <path d={cyl(r, y, y - H)} fill="url(#cw-cyl)" />
      <path d={courses} fill="none" stroke={pal.joint} strokeOpacity={0.25} strokeWidth={0.7} />
      <path d={arc(r, y)} fill="none" stroke={pal.joint} strokeOpacity={0.4} strokeWidth={2.4} />
      {t.banner ? (
        <Banner x={x} y={y - H + r * e + 2} w={r * 0.92} h={H * 0.38} gilded={gilded} />
      ) : gilded ? (
        <path d={`M${pt([x - 2.6, y - H * 0.45])}v-6a2.6 3 0 0 1 5.2 0v6z`} fill="#2a1e12" stroke={GOLD[1]} strokeWidth={0.8} />
      ) : (
        <path d={`M${pt([x - r * 0.25, y - H * 0.42])}v-7`} stroke="#2a1e12" strokeWidth={1.8} strokeLinecap="round" />
      )}
      {crown}
    </>
  );
}

/** Blue cloth with the golden trident of the gatehouse banners. */
function Banner({ x, y, w, h, gilded }: { x: number; y: number; w: number; h: number; gilded: boolean }) {
  const s = w * 0.26;
  const ty = y + h * 0.42;
  return (
    <>
      <path d={poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x, y + h - w * 0.35], [x - w / 2, y + h]])} fill="url(#cw-banner)" stroke={GOLD[1]} strokeWidth={gilded ? 0.9 : 0.6} />
      <path
        d={`M${pt([x, ty - s])}V${r1(ty + s * 1.3)}M${pt([x - s * 0.65, ty - s * 0.8])}V${r1(ty - s * 0.1)}Q${pt([x - s * 0.65, ty + s * 0.35])} ${pt([x, ty + s * 0.35])}Q${pt([x + s * 0.65, ty + s * 0.35])} ${pt([x + s * 0.65, ty - s * 0.1])}V${r1(ty - s * 0.8)}`}
        fill="none"
        stroke={GOLD[2]}
        strokeWidth={0.9}
      />
      <path d={`M${pt([x - w / 2 - 1.5, y])}H${r1(x + w / 2 + 1.5)}`} stroke={GOLD[1]} strokeWidth={1.4} strokeLinecap="round" />
    </>
  );
}
