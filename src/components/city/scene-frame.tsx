"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal scroll frame for the painted city. On narrow screens the scene is wider
 * than the viewport: start centered on the plaza (or on the open plot) instead of the left cliffs.
 */
export function SceneFrame({ children, focusX }: { children: ReactNode; focusX: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const centered = useRef(false);

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
    <div
      ref={ref}
      data-scene-frame
      className="overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-color:rgb(111_179_230/0.4)_transparent] [scrollbar-width:thin]"
    >
      {children}
    </div>
  );
}
