"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { fmtDuration } from "@/lib/format";
import { useServerClock } from "@/lib/use-server-clock";
import { heading } from "@/components/fx/ambient";
import { fx } from "@/components/fx/classes";

export interface FleetPath {
  id: string;
  kind: "attack" | "transport" | "colonize";
  /** % of the scene */
  from: { x: number; y: number };
  to: { x: number; y: number };
  departsAt: number;
  arrivesAt: number;
  /** what the countdown pill says before the time */
  verb: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * The player's own ships on this island's waters: an attack sailing to the camp, cargo on its way,
 * troops coming home. Each one advances with the server clock (one step per second, eased by a
 * one-second linear transition), so the boat is where the mission really is.
 */
export function Fleets({ paths, serverNow }: { paths: FleetPath[]; serverNow: number }) {
  const now = useServerClock(serverNow, 1000);
  const live = paths.filter((p) => now < p.arrivesAt);
  if (!live.length) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[25] overflow-hidden">
      {live.map((p) => {
        const t = clamp01((now - p.departsAt) / Math.max(1, p.arrivesAt - p.departsAt));
        const x = p.from.x + (p.to.x - p.from.x) * t;
        const y = p.from.y + (p.to.y - p.from.y) * t;
        return (
          <div
            key={p.id}
            className="absolute inset-0 transition-transform duration-1000 ease-linear motion-reduce:transition-none"
            style={{ transform: `translate3d(${x}%, ${y}%, 0)` }}
          >
            <div className="absolute top-0 left-0 w-[5.5%] -translate-x-1/2 -translate-y-1/2">
              <div
                className="relative aspect-square"
                style={{ rotate: `${heading(p.from.x, p.from.y, p.to.x, p.to.y).toFixed(1)}deg` } as CSSProperties}
              >
                <span className={fx.wake} />
                <span className={fx.boatHull} />
              </div>
              <span
                className={clsx(
                  "absolute top-[92%] left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shadow-md ring-1 tabular",
                  p.kind === "attack" ? "bg-[#7d1a14]/90 text-marble ring-marble/40" : "bg-sea-950/90 text-gold ring-gold/50",
                )}
              >
                {p.verb} {fmtDuration(Math.max(0, p.arrivesAt - now))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
