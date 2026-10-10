import clsx from "clsx";

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
      <path d="M12.3 22.3c1 .7 2.3 1 3.7 1s2.7-.3 3.7-1M13.4 25c.8.4 1.7.6 2.6.6s1.8-.2 2.6-.6" stroke="#f4e8cc" strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" fill="none" />
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
