"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scrollable frame for wide painted maps. On first mount it centers the element marked
 * with `data-focus` (your city, your island) so narrow screens open on what matters.
 */
export function ScrollFrame({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const centered = useRef(false);

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

  return (
    <div ref={ref} className={className} role={label ? "region" : undefined} aria-label={label}>
      {children}
    </div>
  );
}
