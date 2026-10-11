"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useI18n } from "@/i18n/client";
import { useServerClock } from "@/lib/use-server-clock";
import { whenVisible } from "@/lib/when-visible";

/** Live "time left" label. Refreshes server data once when it reaches zero. */
export function Countdown({ endsAt, serverNow, doneLabel }: { endsAt: number; serverNow: number; doneLabel?: string }) {
  const router = useRouter();
  const { t, fmtDuration } = useI18n();
  const now = useServerClock(serverNow);
  const left = endsAt - now;
  const done = left <= 0;

  // Keyed on `done`, not on every tick, so a refresh waiting for a hidden tab isn't dropped.
  useEffect(() => {
    if (!done) return;
    let cancel = () => {};
    const t = setTimeout(() => (cancel = whenVisible(() => router.refresh())), 600);
    return () => {
      clearTimeout(t);
      cancel();
    };
  }, [done, endsAt, router]);

  return (
    <span className="tabular" suppressHydrationWarning>
      {left > 0 ? fmtDuration(left) : (doneLabel ?? t({ en: "Done", es: "Listo" }))}
    </span>
  );
}

/**
 * Progress bar that fills from startedAt to endsAt, with a light running along the fill.
 * `marker="ship"` sails a small trireme along the bar (voyages at sea).
 */
export function TimeProgress({
  startedAt,
  endsAt,
  serverNow,
  marker,
  className,
}: {
  startedAt: number;
  endsAt: number;
  serverNow: number;
  marker?: "ship";
  className?: string;
}) {
  const now = useServerClock(serverNow, 500);
  const pct = clampPct(startedAt, endsAt, now);
  const done = pct >= 100;
  return (
    <div
      className={clsx("relative w-full", marker === "ship" ? "h-10" : "h-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-ink/15 shadow-[inset_0_1px_2px_rgb(43_33_24/0.25)]",
          marker === "ship" ? "h-2.5 bg-[repeating-linear-gradient(90deg,rgb(19_74_124/0.18)_0_6px,rgb(19_74_124/0.08)_6px_12px)]" : "h-2",
        )}
      >
        <div
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-bronze via-bronze-light to-gold transition-transform duration-500 ease-linear"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
        {!done && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left transition-transform duration-500 ease-linear"
            style={{ transform: `scaleX(${pct / 100})` }}
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent motion-safe:animate-[sheen_2.2s_var(--ease-in-out-sine)_infinite]" />
            </span>
          </div>
        )}
      </div>
      {marker === "ship" && (
        // Moves with `left` (a share of the bar), clamped so the hull never leaves it: a transform in %
        // of a full-width box used to push the page wider than the screen.
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src="/assets/fx/trireme-top.webp"
            alt=""
            width={48}
            height={48}
            className="absolute top-1/2 -mt-5 -ml-5 size-10 drop-shadow-[0_3px_2px_rgb(6_26_48/0.45)] transition-[left] duration-500 ease-linear motion-safe:animate-[ship-bob_2.4s_var(--ease-in-out-sine)_infinite]"
            style={{ left: `clamp(1.25rem, ${pct}%, calc(100% - 1.25rem))`, transform: "rotate(90deg)" }}
          />
        </div>
      )}
    </div>
  );
}

function clampPct(start: number, end: number, now: number) {
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}
