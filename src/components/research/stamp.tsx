"use client";

import { useState } from "react";
import clsx from "clsx";
import { celebrate } from "@/components/motion/celebrate";
import { mountedLate } from "@/components/motion/late-mount";

const burst = new WeakSet<Element>();

/**
 * "Investigada" seal pressed onto a research card. It stamps in (with a golden burst) only when
 * the research finishes while you are looking; on a normal visit it is already there.
 */
export function ResearchedStamp({ className }: { className?: string }) {
  const [fresh] = useState(mountedLate);
  return (
    <span
      ref={(el) => {
        // Once per element (Strict Mode attaches refs twice in development).
        if (!el || !fresh || burst.has(el)) return;
        burst.add(el);
        window.setTimeout(() => celebrate(el, { count: 14, spread: 90 }), 220);
      }}
      className={clsx(
        "pointer-events-none inline-flex -rotate-8 items-center gap-1 rounded-md border-2 border-double border-olive/70 px-2 py-0.5 font-display text-xs font-bold tracking-wider text-olive [text-shadow:0_0_1px_rgb(102_118_58/0.4)]",
        fresh && "stamp-in",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 8.5 3.2 3L13 4.5" />
      </svg>
      Investigada
    </span>
  );
}
