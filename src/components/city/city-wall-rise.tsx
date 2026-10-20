"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const STORE = (cityId: string) => `thalassa:wall-level:${cityId}`;
/** Longer than the last tower's delay plus its spring (see riseDelay in city-wall-art.tsx). */
const RISE_MS = 2600;

/**
 * Wraps the wall ring. When this browser last saw the city with a lower wall level, it sets
 * `data-rise` for one moment: the stones rise and the towers spring up (CSS under `group/wall`).
 * The server always renders the plain ring, so hydration matches; the layout effect runs before the
 * first paint of a client navigation, so the new wall never shows before it rises.
 */
export function WallRise({ cityId, level, className, children }: { cityId: string; level: number; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let last: number | null = null;
    try {
      const raw = window.localStorage.getItem(STORE(cityId));
      last = raw === null ? null : Number(raw);
      window.localStorage.setItem(STORE(cityId), String(level));
    } catch {
      return; // Private mode or blocked storage: the ring simply stands there.
    }
    const el = ref.current;
    if (!el || last === null || !Number.isFinite(last) || level <= last) return;
    el.dataset.rise = "";
    // Not cancelled on cleanup: a second run (Strict Mode) finds the new level already stored.
    window.setTimeout(() => delete el.dataset.rise, RISE_MS);
  }, [cityId, level]);

  return (
    <div ref={ref} aria-hidden className={className}>
      {children}
    </div>
  );
}
