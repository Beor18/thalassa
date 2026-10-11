"use client";

import { useState } from "react";
import clsx from "clsx";
import { celebrate } from "@/components/motion/celebrate";
import { mountedLate } from "@/components/motion/late-mount";

const burst = new WeakSet<Element>();

/**
 * Round "investigada" seal pressed onto a research card. It stamps in (with a golden burst) only
 * when the research finishes while you are looking; on a normal visit it is already there.
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
      title="Investigada"
      className={clsx(
        "pointer-events-none inline-grid size-7 shrink-0 -rotate-8 place-items-center rounded-full border-2 border-double border-olive/80 bg-olive/10 text-olive shadow-[0_0_0_2px_rgb(102_118_58/0.12)]",
        fresh && "stamp-in",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 8.5 3.2 3L13 4.5" />
      </svg>
      <span className="sr-only">Investigada</span>
    </span>
  );
}
