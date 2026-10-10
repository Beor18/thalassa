"use client";

import { useEffect, useRef, type ComponentProps } from "react";

const MAX_SHIFT = 4; // px for a layer of depth 1

/**
 * A scene whose layers drift a few pixels against the mouse, like a camera hovering over the
 * painting. Children opt in with `data-depth` (1 = the ground, bigger = closer to the eye) and
 * may set `data-oversize` (a scale) so their edges never show while they move.
 * Mouse only: touch, pens and reduced motion get a still scene. Styles are written straight to
 * the DOM inside requestAnimationFrame, so React never re-renders while the camera moves.
 */
export function ParallaxScene({ children, ...rest }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let cleanup: (() => void) | null = null;

    const start = () => {
      const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map((el) => ({
        el,
        depth: Number(el.dataset.depth) || 1,
      }));
      for (const { el } of layers) {
        if (el.dataset.oversize) el.style.scale = el.dataset.oversize;
        el.style.willChange = "translate";
      }
      let target = { x: 0, y: 0 };
      const pos = { x: 0, y: 0 };
      let frame = 0;

      const tick = () => {
        pos.x += (target.x - pos.x) * 0.075;
        pos.y += (target.y - pos.y) * 0.075;
        for (const { el, depth } of layers) {
          el.style.translate = `${(pos.x * depth * MAX_SHIFT).toFixed(2)}px ${(pos.y * depth * MAX_SHIFT * 0.7).toFixed(2)}px`;
        }
        frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.002 ? requestAnimationFrame(tick) : 0;
      };
      const kick = () => {
        if (!frame) frame = requestAnimationFrame(tick);
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = root.getBoundingClientRect();
        // The camera leans away from the cursor: the scene slides the other way.
        target = { x: -((e.clientX - r.left) / r.width - 0.5) * 2, y: -((e.clientY - r.top) / r.height - 0.5) * 2 };
        kick();
      };
      const onLeave = () => {
        target = { x: 0, y: 0 };
        kick();
      };
      root.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
      return () => {
        cancelAnimationFrame(frame);
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        for (const { el } of layers) {
          el.style.translate = "";
          el.style.scale = "";
          el.style.willChange = "";
        }
      };
    };

    const sync = () => {
      cleanup?.();
      cleanup = query.matches ? start() : null;
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      cleanup?.();
    };
  }, []);

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}
