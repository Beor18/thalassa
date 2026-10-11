"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/client";

/**
 * Scrollable frame for wide painted maps. On first mount it centers the element marked
 * with `data-focus` (your city, your island) so narrow screens open on what matters.
 * When the painting is wider than the frame, a pill says it can be panned (it goes away after the
 * first pan) and a mouse can drag it like a touch screen. A drag never ends as a click on a spot.
 */
export function ScrollFrame({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  const [overflow, setOverflow] = useState(false);
  const [panned, setPanned] = useState(false);
  const [coarse, setCoarse] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || centered.current) return;
    centered.current = true;
    const target = el.querySelector<HTMLElement>("[data-focus]");
    if (!target) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
      return;
    }
    const frame = el.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    el.scrollLeft += box.left + box.width / 2 - (frame.left + frame.width / 2);
    el.scrollTop += box.top + box.height / 2 - (frame.top + frame.height / 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 4);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const start = el.scrollLeft;
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - start) > 24) setPanned(true);
    };

    // Mouse drag to pan (touch already scrolls natively).
    let drag: { x: number; left: number; moved: boolean } | null = null;
    let swallowClick = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
      drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        el.setPointerCapture(e.pointerId);
        el.dataset.dragging = "";
      }
      el.scrollLeft = drag.left - dx;
    };
    const onUp = () => {
      if (drag?.moved) {
        swallowClick = true;
        // The click (if any) fires right after pointerup; forget the drag once it's gone.
        setTimeout(() => (swallowClick = false), 0);
      }
      drag = null;
      delete el.dataset.dragging;
    };
    // Links and images would start a native drag-and-drop and cancel the pan.
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={clsx(className, overflow && "cursor-grab data-[dragging]:cursor-grabbing data-[dragging]:select-none")}
        role={label ? "region" : undefined}
        aria-label={label}
      >
        {children}
      </div>
      {overflow && (
        <p
          aria-hidden
          className={clsx(
            "pointer-events-none absolute bottom-3 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-sea-950/75 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-foam shadow-lg ring-1 ring-foam/15 backdrop-blur-sm transition-opacity duration-500 motion-reduce:transition-none",
            panned && "opacity-0",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M4 12h16" />
          </svg>
          {coarse
            ? t({ en: "Swipe to see the whole island", es: "Deslizá para ver toda la isla" })
            : t({ en: "Drag to see the whole island", es: "Arrastrá para ver toda la isla" })}
        </p>
      )}
    </div>
  );
}
