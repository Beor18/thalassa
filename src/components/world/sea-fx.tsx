import type { CSSProperties } from "react";
import { rand } from "./geometry";
import { s } from "./styles";

type Extent = { x0: number; y0: number; x1: number; y1: number };

export interface CloudSpec {
  key: number;
  src: string;
  x: number;
  y: number;
  w: number;
  dur: number;
  delay: number;
  travel: number;
  opacity: number;
  flip: boolean;
}

/** Deterministic cloud field over the archipelago (no Math.random: same on server and client). */
export function cloudField(extent: Extent, sources: string[], count = 11): CloudSpec[] {
  if (!sources.length) return [];
  const w = extent.x1 - extent.x0;
  const h = extent.y1 - extent.y0;
  return Array.from({ length: count }, (_, k) => {
    const r = (salt: number) => rand(k + 11, salt + 40);
    // Spread on a loose grid so clouds don't bunch up.
    const col = k % 4;
    const row = Math.floor(k / 4);
    const width = Math.round(620 + r(1) * 460);
    return {
      key: k,
      src: sources[k % sources.length],
      x: Math.round(extent.x0 - 250 + ((col + r(2)) / 4) * (w + 500)),
      y: Math.round(extent.y0 - 150 + ((row + r(3)) / Math.ceil(count / 4)) * (h + 300)),
      w: width,
      dur: Math.round(150 + r(4) * 120),
      delay: -Math.round(r(5) * 260),
      travel: Math.round(1500 + r(6) * 900),
      opacity: Math.round((0.66 + r(7) * 0.24) * 100) / 100,
      flip: r(8) < 0.5,
    };
  });
}

function cloudStyle(c: CloudSpec, dx: number, dy: number, opacity: number): CSSProperties {
  return {
    left: c.x - c.w / 2 + dx,
    top: c.y - c.w / 4 + dy,
    width: c.w,
    height: c.w / 2,
    opacity,
    ["--dur" as string]: `${c.dur}s`,
    ["--delay" as string]: `${c.delay}s`,
    ["--travel" as string]: `${c.travel}px`,
    ["--o" as string]: opacity,
  };
}

/** Clouds in the sky layer (moves with parallax). */
export function Clouds({ clouds }: { clouds: CloudSpec[] }) {
  return clouds.map((c) => (
    <div key={c.key} className={s.cloud} style={cloudStyle(c, 0, 0, c.opacity)}>
      <div className={s.cloudArt} style={{ backgroundImage: `url(${c.src})`, transform: c.flip ? "scaleX(-1)" : undefined }} />
    </div>
  ));
}

/** Their shadows on the sea (moves with the world, so they slide under the clouds as you pan). */
export function CloudShadows({ clouds }: { clouds: CloudSpec[] }) {
  return clouds.map((c) => (
    <div key={c.key} className={s.cloudShadow} style={cloudStyle(c, 120, 170, 0.15)}>
      <div className={s.cloudArt} style={{ backgroundImage: `url(${c.src})`, transform: c.flip ? "scaleX(-1)" : undefined }} />
    </div>
  ));
}

const GULLS = [
  { top: "24%", dur: 46, delay: -4, rise: -70 },
  { top: "27.5%", dur: 46, delay: -5.3, rise: -64 },
  { top: "66%", dur: 63, delay: -31, rise: -110 },
];

/** A few gulls crossing the screen now and then. Screen-space, so you always get to see them. */
export function Gulls({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <div className={s.gulls} aria-hidden>
      {GULLS.map((g, i) => (
        <div
          key={i}
          className={s.gull}
          style={{
            top: g.top,
            ["--dur" as string]: `${g.dur}s`,
            ["--delay" as string]: `${g.delay}s`,
            ["--rise" as string]: `${g.rise}px`,
          }}
        >
          <div className={s.gullWings} style={{ animationDelay: `${-i * 0.27}s` }}>
            <div className={s.gullShadow} style={{ backgroundImage: `url(${src})` }} />
            <div className={s.gullBody} style={{ backgroundImage: `url(${src})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Fallback caustics when the painted texture is missing: ridged noise, seamless thanks to stitchTiles.
const CAUSTICS_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.011' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -2.4 0 0 0 0.9'/></filter><rect width='512' height='512' filter='url(%23c)'/></svg>`;
const CAUSTICS_FALLBACK = `data:image/svg+xml,${CAUSTICS_SVG.replace(/</g, "%3C").replace(/>/g, "%3E")}`;

export function CausticsLayers({ src }: { src: string | null }) {
  const url = `url("${src ?? CAUSTICS_FALLBACK}")`;
  return (
    <>
      <div className={s.causticsA} style={{ backgroundImage: url }} />
      <div className={s.causticsB} style={{ backgroundImage: url }} />
    </>
  );
}

export function Compass({ src, className }: { src: string | null; className?: string }) {
  if (!src) return null;
  return (
    <div aria-hidden className={`${s.compass} ${className ?? ""}`}>
      <div className={s.compassArt} style={{ backgroundImage: `url(${src})` }} />
    </div>
  );
}
