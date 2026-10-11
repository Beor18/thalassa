import type { ReactNode } from "react";
import clsx from "clsx";

/* Line icons for the HUD (24 grid, round stroke), drawn to match the island icon set. */
export type HudIcon = (props: { className?: string }) => ReactNode;

function Line({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Temple front: the polis. */
export const IconCity: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M3 9.2 12 4l9 5.2Z" />
    <path d="M5.5 12.2v5.6M9.8 12.2v5.6M14.2 12.2v5.6M18.5 12.2v5.6M3.5 20.5h17" />
  </Line>
);

/** Hill and a cypress over the waves. */
export const IconIsland: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M4.5 15.5c1.6-3.9 4.4-6 7.5-6s5.9 2.1 7.5 6" />
    <path d="M9 9.8V6.2M9 6.2c-.9-1.6-.4-2.6 0-3.2.4.6.9 1.6 0 3.2Z" />
    <path d="M2.5 19c1.6 1 3.2 1 4.8 0s3.2-1 4.7 0 3.2 1 4.7 0 3.2-1 4.8 0" />
  </Line>
);

/** Compass: the Aegean. */
export const IconWorld: HudIcon = ({ className }) => (
  <Line className={className}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z" />
  </Line>
);

/** Scroll: the academy's research. */
export const IconResearch: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M7.5 4h10.2A2.3 2.3 0 0 1 20 6.3c0 1.2-1 2.2-2.2 2.2H16" />
    <path d="M16 6.3V18a2.5 2.5 0 0 1-2.5 2.5H5.8A2.3 2.3 0 0 1 3.5 18.2c0-1.2 1-2.2 2.2-2.2H8V6.3A2.3 2.3 0 0 1 10.3 4" />
    <path d="M11 9.5h2.2M11 12.5h2.2" />
  </Line>
);

/** Crossed swords: fleet and troops. */
export const IconSwords: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M14.5 17.5 3.5 6.5V3.5h3l11 11" />
    <path d="m13 19 6-6M16.5 16.5l3.5 3.5" />
    <path d="M9.5 14.5 5 19M7.5 12.5l4 4M3.5 20.5l1.5-1.5" />
    <path d="m14.5 9.5 6-6h-3l-4.5 4.5" />
  </Line>
);

/** Sealed letter: reports. */
export const IconReports: HudIcon = ({ className }) => (
  <Line className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.6 7 8.4 6.3L20.4 7" />
  </Line>
);

/** Laurel wreath: the ranking. */
export const IconTrophy: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M10.5 20.2C6.4 19.4 3.5 16 3.5 12c0-2.6 1.2-4.9 3-6.4" />
    <path d="M13.5 20.2c4.1-.8 7-4.2 7-8.2 0-2.6-1.2-4.9-3-6.4" />
    <path d="M5.2 15.2c1.6.1 2.8-.6 3.3-1.8-1.5-.3-2.8.3-3.3 1.8ZM4 10.6c1.4.5 2.7.1 3.5-.9-1.3-.7-2.7-.5-3.5.9ZM6 6.4c1 .9 2.3 1 3.3.3-.9-1.1-2.3-1.3-3.3-.3Z" />
    <path d="M18.8 15.2c-1.6.1-2.8-.6-3.3-1.8 1.5-.3 2.8.3 3.3 1.8ZM20 10.6c-1.4.5-2.7.1-3.5-.9 1.3-.7 2.7-.5 3.5.9ZM18 6.4c-1 .9-2.3 1-3.3.3.9-1.1 2.3-1.3 3.3-.3Z" />
  </Line>
);

/** Drop of nectar with a glint. */
export const IconNectar: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M12 3.5c-3.3 4.2-5.6 7.1-5.6 10.2a5.6 5.6 0 0 0 11.2 0c0-3.1-2.3-6-5.6-10.2Z" />
    <path d="M9.6 14.2a2.5 2.5 0 0 0 2.4 2.4" />
  </Line>
);

/** Person and a plus: bring a friend. */
export const IconInvite: HudIcon = ({ className }) => (
  <Line className={className}>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3 20c.8-3.5 3.4-5.6 6.5-5.6s5.7 2.1 6.5 5.6" />
    <path d="M19 7.5v6M16 10.5h6" />
  </Line>
);

/** Three dots: more sections. */
export const IconMore: HudIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={clsx("shrink-0", className)} fill="currentColor">
    <circle cx="5" cy="12" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="19" cy="12" r="1.9" />
  </svg>
);

export const IconChevron: HudIcon = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    className={clsx("shrink-0", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
);

export const IconCheck: HudIcon = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    className={clsx("shrink-0", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3.5 8.5 3 2.8L12.5 5" />
  </svg>
);

/** Door with an arrow: leave the game. */
export const IconLeave: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M13.5 4.5h-7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
    <path d="M15.5 8.5 19 12l-3.5 3.5M19 12H9.5" />
  </Line>
);

/** Shield: what raiders can't take. */
export const IconShield: HudIcon = ({ className }) => (
  <Line className={className}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6Z" />
  </Line>
);

/** Athena's owl, the advisor's seal. Eyes blink now and then. */
export function OwlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={clsx("shrink-0", className)}>
      {/* body with ear tufts */}
      <path
        d="M7.5 6.5 11 10.6c1.6-.7 3.2-1 5-1s3.4.3 5 1l3.5-4.1c.9 2.6 1.1 5.4.6 8.1.4 1 .6 2.1.6 3.2 0 5.6-4.3 10.2-9.7 10.6C10.6 28 6.3 23.4 6.3 17.8c0-1.1.2-2.2.6-3.2-.5-2.7-.3-5.5.6-8.1Z"
        fill="currentColor"
      />
      {/* chest feathers */}
      <path
        d="M12.3 22.3c1 .7 2.3 1 3.7 1s2.7-.3 3.7-1M13.4 25c.8.4 1.7.6 2.6.6s1.8-.2 2.6-.6"
        stroke="#f4e8cc"
        strokeOpacity=".55"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
      {/* eyes */}
      <g className="motion-safe:animate-[blink_6s_ease-in-out_2s_infinite]" style={{ transformOrigin: "16px 15.5px" }}>
        <circle cx="12.2" cy="15.5" r="3.7" fill="#f4e8cc" />
        <circle cx="19.8" cy="15.5" r="3.7" fill="#f4e8cc" />
        <circle cx="12.6" cy="15.6" r="1.8" fill="#2b2118" />
        <circle cx="19.4" cy="15.6" r="1.8" fill="#2b2118" />
        <circle cx="13.2" cy="14.9" r=".55" fill="#fff" />
        <circle cx="20" cy="14.9" r=".55" fill="#fff" />
      </g>
      {/* beak */}
      <path d="m16 17.4-1.3 1.5 1.3 2 1.3-2Z" fill="#e3b341" />
    </svg>
  );
}

/** Laurel wreath for champions. */
const LAUREL_LEAVES = (() => {
  const cx = 32;
  const cy = 17;
  const r = 19;
  const out: { x: number; y: number; rot: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const deg = 108 + i * 20;
    const t = (deg * Math.PI) / 180;
    const px = cx + r * Math.cos(t);
    const py = cy + r * Math.sin(t);
    const nx = Math.cos(t);
    const ny = Math.sin(t);
    const tangent = (Math.atan2(Math.cos(t), -Math.sin(t)) * 180) / Math.PI;
    out.push({ x: px + nx * 3.4, y: py + ny * 3.4, rot: tangent + 32 });
    out.push({ x: px - nx * 3, y: py - ny * 3, rot: tangent - 32 });
  }
  return out.map((l) => ({ x: +l.x.toFixed(2), y: +l.y.toFixed(2), rot: +l.rot.toFixed(1) }));
})();

/** Laurel wreath for champions. */
export function LaurelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" aria-hidden className={clsx("shrink-0", className)} fill="currentColor">
      <path d="M30 36.2A19 19 0 0 1 16.4 5.6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M34 36.2A19 19 0 0 0 47.6 5.6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {LAUREL_LEAVES.map((l, i) => (
        <g key={i}>
          <ellipse cx={l.x} cy={l.y} rx="4.4" ry="1.8" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
          <ellipse cx={64 - l.x} cy={l.y} rx="4.4" ry="1.8" transform={`rotate(${180 - l.rot} ${64 - l.x} ${l.y})`} />
        </g>
      ))}
    </svg>
  );
}
