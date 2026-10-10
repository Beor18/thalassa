import type { CSSProperties } from "react";

/**
 * Delay for the nth item of a staggered entrance. Pair with the `rise-in`, `pop-in`, `fade-in`,
 * `wipe-in` or `draw-y` classes from globals.css. Pure CSS: works in Server Components, needs no
 * JavaScript and respects prefers-reduced-motion.
 *
 *   <li className="rise-in" style={stagger(i)}>
 *
 * Items past `cap` share the last delay so long lists never make people wait.
 */
export function stagger(i: number, step = 45, cap = 8, base = 0): CSSProperties {
  return { "--d": `${base + Math.min(i, cap) * step}ms` } as CSSProperties;
}

/** Deterministic pseudo-random number in [0, 1) for decorative layouts (no Math.random in render). */
export function seeded(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
