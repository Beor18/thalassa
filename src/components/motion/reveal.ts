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

/**
 * Deterministic pseudo-random number in [0, 1) for decorative layouts (no Math.random in render).
 * Integer-only math (mulberry32), so server and browser compute the exact same value.
 */
export function seeded(n: number) {
  let t = (Math.imul(n, 0x9e3779b1) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
