/**
 * celebrate(): a small golden burst for success moments (a purchase, a research, a finished build).
 * DOM-only and framework-free, so any client component can call it after an action resolves:
 *
 *   import { celebrate } from "@/components/motion/celebrate";
 *   celebrate();                 // at the last click or tap
 *   celebrate(buttonRef.current); // centered on an element
 *   celebrate({ x, y }, { tone: "ambrosia", count: 22 });
 *
 * Uses the Web Animations API (compositor-friendly transforms and opacity) and cleans up after
 * itself. With prefers-reduced-motion it shows a single soft glint that fades, no flying particles.
 */

type Point = { x: number; y: number };
type Tone = "gold" | "ambrosia";

const SPARKLE = "/assets/fx/sparkle.webp";
let lastPointer: Point | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true },
  );
}

function resolveOrigin(origin?: Point | Element | null): Point {
  if (origin && "getBoundingClientRect" in origin) {
    const r = origin.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (origin && "x" in origin) return origin;
  if (lastPointer) return lastPointer;
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

const TONES: Record<Tone, { dot: string[]; glow: string }> = {
  gold: { dot: ["#ffe7a3", "#e3b341", "#fff6d6", "#d39a45"], glow: "rgb(227 179 65 / 0.55)" },
  ambrosia: { dot: ["#d7b8ff", "#ffe7a3", "#b585f0", "#fff6d6"], glow: "rgb(155 93 229 / 0.5)" },
};

export function celebrate(origin?: Point | Element | null, opts: { count?: number; tone?: Tone; spread?: number } = {}) {
  if (typeof document === "undefined") return;
  const { x, y } = resolveOrigin(origin);
  const tone = TONES[opts.tone ?? "gold"];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: "0",
    height: "0",
    zIndex: "200",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(layer);

  // Central glint
  const glint = document.createElement("img");
  glint.src = SPARKLE;
  glint.alt = "";
  Object.assign(glint.style, {
    position: "absolute",
    width: "120px",
    height: "120px",
    left: "-60px",
    top: "-60px",
    filter: `drop-shadow(0 0 12px ${tone.glow})`,
  } satisfies Partial<CSSStyleDeclaration>);
  layer.appendChild(glint);

  if (reduced) {
    glint.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }], { duration: 650, easing: "ease-out" }).finished.finally(() =>
      layer.remove(),
    );
    return;
  }

  glint.animate(
    [
      { transform: "scale(0.2) rotate(0deg)", opacity: 0 },
      { transform: "scale(1.05) rotate(25deg)", opacity: 1, offset: 0.35 },
      { transform: "scale(0.7) rotate(45deg)", opacity: 0 },
    ],
    { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
  );

  const count = opts.count ?? 16;
  const spread = opts.spread ?? 110;
  let longest = 700;
  for (let i = 0; i < count; i++) {
    const p = document.createElement(i % 3 === 0 ? "img" : "span");
    const size = i % 3 === 0 ? 18 + Math.random() * 14 : 5 + Math.random() * 5;
    if (p instanceof HTMLImageElement) {
      p.src = SPARKLE;
      p.alt = "";
    } else {
      p.style.borderRadius = "9999px";
      p.style.background = tone.dot[i % tone.dot.length];
      p.style.boxShadow = `0 0 8px ${tone.glow}`;
    }
    Object.assign(p.style, {
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      left: `${-size / 2}px`,
      top: `${-size / 2}px`,
    } satisfies Partial<CSSStyleDeclaration>);
    layer.appendChild(p);

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const dist = spread * (0.45 + Math.random() * 0.55);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 18;
    const spin = (Math.random() - 0.5) * 220;
    const duration = 650 + Math.random() * 350;
    longest = Math.max(longest, duration);
    p.animate(
      [
        { transform: "translate(0, 0) scale(0.4) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.08}px, ${dy + 34}px) scale(0.5) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
  }
  window.setTimeout(() => layer.remove(), longest + 80);
}
