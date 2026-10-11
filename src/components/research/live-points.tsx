"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { Countdown } from "@/components/ui/countdown";
import { fmt } from "@/lib/format";
import { useServerClock } from "@/lib/use-server-clock";

const liveValue = (value: number, perHour: number, serverNow: number, now: number) =>
  value + (perHour * Math.max(0, now - serverNow)) / 3_600_000;

/**
 * A server snapshot value that keeps growing at `perHour` between refreshes, with its unit in the
 * right number ("1 punto", "2 puntos"). Jumps after an action count up instead of snapping.
 */
export function LivePoints({
  value,
  perHour,
  serverNow,
  unit = ["punto", "puntos"],
  unitClassName,
}: {
  value: number;
  perHour: number;
  serverNow: number;
  unit?: [singular: string, plural: string];
  unitClassName?: string;
}) {
  const now = useServerClock(serverNow);
  const live = liveValue(value, perHour, serverNow, now);
  return (
    <>
      <AnimatedNumber value={live} animateKey={serverNow} minDelta={2 + perHour / 1200} float />{" "}
      <span className={unitClassName} suppressHydrationWarning>
        {Math.floor(live) === 1 ? unit[0] : unit[1]}
      </span>
    </>
  );
}

/**
 * How close a research is: a bar that fills as points arrive, the points still missing and the
 * time to get there. When the time runs out the Countdown refreshes the page and the card turns
 * into "ready".
 */
export function TechProgress({ cost, points, perHour, serverNow }: { cost: number; points: number; perHour: number; serverNow: number }) {
  const now = useServerClock(serverNow);
  const live = liveValue(points, perHour, serverNow, now);
  const pct = Math.max(0, Math.min(1, live / cost));
  const missing = Math.max(1, Math.ceil(cost - live));
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span aria-hidden className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-ink/10">
        <span
          className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-bronze to-gold transition-transform duration-700 ease-out"
          style={{ transform: `scaleX(${pct})` }}
        />
      </span>
      <span className="tabular shrink-0 font-bold text-terracotta" suppressHydrationWarning>
        Faltan {fmt(missing)} {missing === 1 ? "punto" : "puntos"}
      </span>
      {perHour > 0 && (
        <span className="shrink-0 text-ink-soft">
          <span aria-hidden>· </span>
          <span className="sr-only">, llegás en </span>
          <Countdown endsAt={serverNow + ((cost - points) / perHour) * 3_600_000} serverNow={serverNow} doneLabel="ya" />
        </span>
      )}
    </div>
  );
}
