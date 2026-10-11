"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal scroll frame for the painted city. On narrow screens the scene is wider
 * than the viewport: start centered on the plaza (or on the open plot) instead of the left cliffs.
 * `hint` shows a small "swipe" pill while the scene overflows, until the player scrolls it once.
 */
export function SceneFrame({ children, focusX, hint }: { children: ReactNode; focusX: number; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || centered.current) return;
    centered.current = true;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 0) return;
    const target = (focusX / 100) * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, Math.min(overflow, target));
  }, [focusX]);

  return (
    <>
      <div
        ref={ref}
        data-scene-frame
        // Only the player's own gestures count: centering the scene on mount also scrolls it.
        onPointerDown={moved ? undefined : (e) => e.pointerType !== "mouse" && setMoved(true)}
        onWheel={moved ? undefined : () => setMoved(true)}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-color:rgb(111_179_230/0.4)_transparent] [scrollbar-width:thin]"
      >
        {children}
      </div>
      {hint && (
        <p
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 z-[60] rounded-full bg-sea-950/75 px-2.5 py-1 text-xs font-bold text-foam/90 transition-opacity duration-300 md:hidden"
          style={{ opacity: moved ? 0 : 1 }}
        >
          {hint}
        </p>
      )}
    </>
  );
}
