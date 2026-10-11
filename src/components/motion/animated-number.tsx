"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useI18n } from "@/i18n/client";

type Props = {
  value: number;
  format?: (n: number) => string;
  /**
   * When given, only a change that arrives together with a new key animates (for example the
   * server snapshot time), so live per-second ticks stay instant and only real jumps count up.
   */
  animateKey?: string | number;
  /** Changes smaller than this snap instead of animating. */
  minDelta?: number;
  /** Shows a small "+N" / "−N" that floats up from the number when it jumps. */
  float?: boolean;
  duration?: number;
  className?: string;
};

/**
 * A number that counts to its new value. The first render prints `format(value)` exactly, so
 * server HTML and hydration always match; every later update is written straight to the DOM
 * (no React re-render per frame).
 */
export function AnimatedNumber({ value, format: formatProp, animateKey, minDelta = 1, float = false, duration = 0.7, className }: Props) {
  // Whole numbers in the player's language unless the caller formats them.
  const { fmt } = useI18n();
  const format = formatProp ?? fmt;
  const [initialText] = useState(() => format(value));
  const textRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const lastKey = useRef(animateKey);
  const anim = useRef<{ controls: AnimationPlaybackControls; endsAt: number } | null>(null);
  const formatRef = useRef(format);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useLayoutEffect(() => {
    const el = textRef.current;
    const keyChanged = animateKey !== lastKey.current;
    lastKey.current = animateKey;
    if (!el) return;
    const from = shown.current;
    const to = value;
    if (from === to) return;
    const write = (v: number) => {
      shown.current = v;
      el.textContent = formatRef.current(v);
    };
    const now = performance.now();
    const running = anim.current && now < anim.current.endsAt;
    const jump = Math.abs(to - from) >= minDelta && (animateKey === undefined || keyChanged);

    if (reduce || (!jump && !running)) {
      anim.current?.controls.stop();
      anim.current = null;
      write(to);
      return;
    }
    if (jump && float && el.parentElement) spawnFloat(el.parentElement, to - from, formatRef.current);
    // A tick during a running count retargets it for the remaining time instead of snapping.
    const seconds = jump ? duration : Math.max(0.15, (anim.current!.endsAt - now) / 1000);
    anim.current?.controls.stop();
    anim.current = {
      controls: animate(from, to, { duration: seconds, ease: [0.22, 1, 0.36, 1], onUpdate: write }),
      endsAt: now + seconds * 1000,
    };
  }, [value, animateKey, minDelta, float, duration, reduce]);

  useEffect(() => () => anim.current?.controls.stop(), []);

  return (
    <span className={clsx("relative inline-block tabular", className)}>
      <span ref={textRef}>{initialText}</span>
    </span>
  );
}

function spawnFloat(container: HTMLElement, delta: number, format: (n: number) => string) {
  const tag = document.createElement("span");
  tag.setAttribute("aria-hidden", "true");
  tag.textContent = `${delta > 0 ? "+" : "−"}${format(Math.abs(delta))}`;
  tag.className = clsx(
    "pointer-events-none absolute bottom-full left-1/2 z-10 text-xs font-extrabold whitespace-nowrap tabular",
    "[text-shadow:0_1px_3px_rgb(6_26_48/0.95)]",
    delta > 0 ? "text-gold-light" : "text-danger-soft",
  );
  container.appendChild(tag);
  tag
    .animate(
      [
        { transform: "translate(-50%, 6px) scale(0.8)", opacity: 0 },
        { transform: "translate(-50%, -2px) scale(1.05)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -18px) scale(1)", opacity: 0 },
      ],
      { duration: 1300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    )
    .finished.finally(() => tag.remove());
}
