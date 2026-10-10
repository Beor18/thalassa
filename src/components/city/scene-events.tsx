"use client";

import { createContext, use, useEffect, useEffectEvent, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { BUILDINGS, type BuildingType } from "@/game/data";
import { CITY_PLOTS, CITY_SPRITE_WIDTH } from "@/game/layout";
import { fx as scene } from "@/components/fx/classes";
import { plotId } from "./lib";

/*
  Celebrations on the city scene. The server sends a tiny snapshot of the plots; when a level
  goes up (a construction finished) or a new construction starts, the scene plays a moment:
  golden burst + the building dropping into place, or the scaffolding springing up.

  - Live: the snapshot changes while the page is open (timer ran out, "Terminar ya", "Construir").
    Detected during render, so the new sprite starts its entrance before the first paint.
  - Late: the construction finished while the player was elsewhere. The last snapshot seen in this
    tab lives in sessionStorage per city; on mount we compare and celebrate with a softer pop
    (the sprite is already on screen, so it can't drop in).
*/

export type PlotTuple = [slot: number, type: BuildingType, level: number];
export interface CitySnapshot {
  b: PlotTuple[];
  /** construction in progress: [slot, type, target level] */
  c: PlotTuple | null;
}

interface SceneEvent {
  id: string;
  kind: "done" | "start";
  slot: number;
  type: BuildingType;
  level: number;
  live: boolean;
}

const EventsCtx = createContext<SceneEvent[]>([]);
const STORE = (cityId: string) => `thalassa:city-scene:${cityId}`;

function diff(prev: CitySnapshot, next: CitySnapshot, live: boolean): SceneEvent[] {
  const out: SceneEvent[] = [];
  const before = new Map(prev.b.map(([slot, type, level]) => [slot, { type, level }]));
  for (const [slot, type, level] of next.b) {
    const was = before.get(slot);
    if (!was ? true : was.type === type && level > was.level) {
      out.push({ id: `done:${slot}:${type}:${level}`, kind: "done", slot, type, level, live });
    }
  }
  const c = next.c;
  if (c && (!prev.c || prev.c[0] !== c[0] || prev.c[2] !== c[2])) {
    out.push({ id: `start:${c[0]}:${c[1]}:${c[2]}`, kind: "start", slot: c[0], type: c[1], level: c[2], live });
  }
  return out;
}

function readStore(cityId: string): { snap: CitySnapshot; seen: string[] } | null {
  try {
    const raw = window.sessionStorage.getItem(STORE(cityId));
    const data = raw ? (JSON.parse(raw) as { snap?: CitySnapshot; seen?: string[] }) : null;
    if (!data?.snap || !Array.isArray(data.snap.b)) return null;
    return { snap: data.snap, seen: Array.isArray(data.seen) ? data.seen : [] };
  } catch {
    return null;
  }
}

function writeStore(cityId: string, snap: CitySnapshot, seen: string[]) {
  try {
    const merged = [...new Set([...(readStore(cityId)?.seen ?? []), ...seen])].slice(-40);
    window.sessionStorage.setItem(STORE(cityId), JSON.stringify({ snap, seen: merged }));
  } catch {
    // Private mode or full storage: celebrations still work while the page stays open.
  }
}

const FEMININE = new Set<BuildingType>(["town_hall", "academy", "tavern", "wall", "carpenter", "stonemason"]);

export function doneMessage(type: BuildingType, level: number): string {
  const ready = FEMININE.has(type) ? "lista" : "listo";
  return level > 1 ? `¡${BUILDINGS[type].name} nivel ${level} ${ready}!` : `¡${BUILDINGS[type].name} ${ready}!`;
}

export function SceneEvents({ cityId, snapshot, children }: { cityId: string; snapshot: CitySnapshot; children: ReactNode }) {
  const key = JSON.stringify(snapshot);
  const [shown, setShown] = useState(key);
  const [events, setEvents] = useState<SceneEvent[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // Live: the server sent a new snapshot while the page is open.
  if (key !== shown) {
    setShown(key);
    const fresh = diff(JSON.parse(shown) as CitySnapshot, snapshot, true).filter((e) => !seen.includes(e.id));
    if (fresh.length) {
      setEvents((list) => [...list, ...fresh]);
      setSeen((list) => [...list, ...fresh.map((e) => e.id)]);
      const done = fresh.filter((e) => e.kind === "done");
      if (done.length) setMessage(done.map((e) => doneMessage(e.type, e.level)).join(" "));
    }
  }

  // Late: compare with what this tab saw last time (runs again when a cached page comes back).
  useEffect(() => {
    const stored = readStore(cityId);
    const current = JSON.parse(key) as CitySnapshot;
    if (!stored) {
      writeStore(cityId, current, []);
      return;
    }
    const late = diff(stored.snap, current, false).filter((e) => e.kind === "done" && !stored.seen.includes(e.id));
    const seenNow = [...stored.seen, ...late.map((e) => e.id)];
    writeStore(cityId, current, seenNow);
    const frame = requestAnimationFrame(() => {
      setSeen(seenNow);
      if (!late.length) return;
      setEvents((list) => [...list, ...late]);
      setMessage(late.map((e) => doneMessage(e.type, e.level)).join(" "));
    });
    return () => cancelAnimationFrame(frame);
    // Only on mount: later snapshots are handled live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  // Keep the tab's memory in sync with every snapshot the player sees.
  useEffect(() => {
    writeStore(cityId, JSON.parse(key) as CitySnapshot, seen);
  }, [cityId, key, seen]);

  const remove = (id: string) => setEvents((list) => list.filter((e) => e.id !== id));

  return (
    <EventsCtx value={events}>
      {children}
      <AnimatePresence>
        {events.map((e) =>
          e.kind === "done" ? (
            <Celebration key={e.id} event={e} onDone={() => remove(e.id)} />
          ) : (
            <DustBurst key={e.id} event={e} onDone={() => remove(e.id)} />
          ),
        )}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </EventsCtx>
  );
}

function useSlotEvent(slot: number, kind: SceneEvent["kind"]): SceneEvent | null {
  const events = use(EventsCtx);
  for (let i = events.length - 1; i >= 0; i--) if (events[i].slot === slot && events[i].kind === kind) return events[i];
  return null;
}

/**
 * Wraps a plot sprite. A finished building drops into place with a spring (or pops if it was
 * already on screen); new scaffolding springs up from the ground.
 */
export function PlotMotion({
  slot,
  role,
  className = "block",
  children,
}: {
  slot: number;
  role: "building" | "scaffold";
  className?: string;
  children: ReactNode;
}) {
  const event = useSlotEvent(slot, role === "building" ? "done" : "start");
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = scope.current;
    if (!event || reduce || !el) return;
    if (!event.live || (role === "building" && event.level > 1)) {
      // Already on screen (a late celebration or an upgrade): a proud little bounce.
      animate(el, { scale: [1, 1.12, 1], y: ["0%", "-6%", "0%"] }, { duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 });
    } else if (role === "building") {
      animate(
        el,
        { y: ["-34%", "0%"], scale: [0.86, 1], opacity: [0, 1] },
        { default: { type: "spring", stiffness: 300, damping: 15, mass: 0.9, delay: 0.18 }, opacity: { duration: 0.2, delay: 0.18 } },
      );
    } else {
      animate(
        el,
        { scale: [0.4, 1], y: ["10%", "0%"], opacity: [0, 1] },
        { default: { type: "spring", stiffness: 420, damping: 16 }, opacity: { duration: 0.15 } },
      );
    }
  }, [event, reduce, role, animate, scope]);

  return (
    <span ref={scope} className={`${className} origin-[50%_78%]`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.17;
  const reach = 70 + ((i * 37) % 45);
  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach * 0.62 - 26,
    size: 5 + (i % 4),
    color: ["#fff3c4", "#e3b341", "#ffd76a", "#fffaf0"][i % 4],
    delay: (i % 5) * 0.025,
  };
});

/** Where the sprite of a plot sits, in % of the scene (same box as the Plot link). */
function plotBox(slot: number) {
  const pos = CITY_PLOTS[slot];
  return { left: `${pos.x}%`, top: `${pos.y}%`, width: `${CITY_SPRITE_WIDTH}%` };
}

/** Bring the plot into view inside the horizontally scrolling scene (phones). */
function revealPlot(slot: number, smooth: boolean) {
  const el = document.getElementById(plotId(slot));
  const frame = el?.closest<HTMLElement>("[data-scene-frame]");
  if (!el || !frame || frame.scrollWidth <= frame.clientWidth) return;
  const f = frame.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  if (b.left >= f.left && b.right <= f.right) return;
  frame.scrollTo({ left: frame.scrollLeft + b.left + b.width / 2 - (f.left + f.width / 2), behavior: smooth ? "smooth" : "auto" });
}

function Celebration({ event, onDone }: { event: SceneEvent; onDone: () => void }) {
  const reduce = useReducedMotion();
  const pos = CITY_PLOTS[event.slot];
  // The top row would push a ribbon above the painting: show it under the building instead.
  const below = pos.y < 22;

  const finish = useEffectEvent(onDone);
  useEffect(() => {
    revealPlot(event.slot, !reduce);
    const t = setTimeout(finish, 3400);
    return () => clearTimeout(t);
  }, [event.slot, reduce]);

  return (
    <div aria-hidden className="pointer-events-none absolute z-[55]" style={plotBox(event.slot)}>
      <div className="relative aspect-square w-full -translate-x-1/2 -translate-y-[70%]">
        {!reduce && (
          <>
            {/* Light rays turning behind the building */}
            <motion.span
              className="absolute inset-[-35%] rounded-full mix-blend-screen"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgb(255 226 140 / 0.55) 0deg 7deg, transparent 7deg 22deg)",
                maskImage: "radial-gradient(closest-side, black 20%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(closest-side, black 20%, transparent 72%)",
              }}
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: [0, 0.95, 0], scale: [0.5, 1.15, 1.3], rotate: [-10, 25, 40] }}
              transition={{ duration: 2.2, ease: "easeOut", times: [0, 0.25, 1] }}
            />
            {/* Shockwave on the ground */}
            <motion.span
              className="absolute top-[74%] left-1/2 aspect-[2.1/1] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ boxShadow: "inset 0 0 0 3px rgb(255 226 140 / 0.95), 0 0 16px rgb(227 179 65 / 0.8)" }}
              initial={{ opacity: 0.9, scale: 0.35 }}
              animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
            {/* Golden burst */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src="/assets/fx/sparkle.webp"
              alt=""
              className="absolute inset-[-10%] w-[120%] max-w-none"
              initial={{ opacity: 0, scale: 0.2, rotate: -25 }}
              animate={{ opacity: [0, 1, 0], scale: [0.2, 1.25, 1.5], rotate: [-25, 10, 30] }}
              transition={{ duration: 1.2, times: [0, 0.3, 1], ease: "easeOut" }}
            />
            {/* Particles */}
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute top-[52%] left-1/2 rounded-full"
                style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 6px ${p.color}` }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                animate={{ x: [0, p.x], y: [0, p.y, p.y + 34], opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
                transition={{ duration: 1.3, delay: 0.12 + p.delay, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
              />
            ))}
          </>
        )}
      </div>
      <motion.div
        className={`${scene.ribbon} ${scene.ribbonGold} ${scene.ribbonLarge}`}
        style={{ "--top": below ? "38%" : "-78%", zIndex: 3 } as CSSProperties}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
        transition={{ type: "spring", stiffness: 380, damping: 20, delay: reduce ? 0 : 0.35 }}
      >
        <span className={scene.ribbonFace}>
          <span className={scene.ribbonTitle}>{doneMessage(event.type, event.level)}</span>
        </span>
      </motion.div>
    </div>
  );
}

const DUST = [
  { x: -46, y: -6, s: 0.9 },
  { x: 44, y: -10, s: 1 },
  { x: -18, y: -30, s: 0.8 },
  { x: 22, y: -26, s: 0.85 },
  { x: 0, y: 4, s: 1.1 },
];

function DustBurst({ event, onDone }: { event: SceneEvent; onDone: () => void }) {
  const reduce = useReducedMotion();
  const finish = useEffectEvent(onDone);
  useEffect(() => {
    if (event.live) revealPlot(event.slot, !reduce);
    const t = setTimeout(finish, 1600);
    return () => clearTimeout(t);
  }, [event.live, event.slot, reduce]);
  if (reduce || !event.live) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute z-[55]" style={plotBox(event.slot)}>
      <div className="relative aspect-square w-full -translate-x-1/2 -translate-y-[70%]">
        {DUST.map((d, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            key={i}
            src="/assets/fx/smoke.webp"
            alt=""
            className="absolute top-[58%] left-1/2 w-[46%] max-w-none -translate-x-1/2 -translate-y-1/2"
            style={{ filter: "sepia(0.6) saturate(0.8) brightness(1.02)" }}
            initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
            animate={{ opacity: [0, 0.75, 0], scale: [0.3, d.s, d.s * 1.35], x: [0, d.x], y: [0, d.y] }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 1], delay: i * 0.03 }}
          />
        ))}
      </div>
    </div>
  );
}
