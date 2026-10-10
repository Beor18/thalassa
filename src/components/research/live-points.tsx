"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { useServerClock } from "@/lib/use-server-clock";

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
  const live = value + (perHour * Math.max(0, now - serverNow)) / 3_600_000;
  return (
    <>
      <AnimatedNumber value={live} animateKey={serverNow} minDelta={2 + perHour / 1200} float />{" "}
      <span className={unitClassName}>{Math.floor(live) === 1 ? unit[0] : unit[1]}</span>
    </>
  );
}
