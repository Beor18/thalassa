"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { RESOURCES, RESOURCE_INFO, type Resource } from "@/game/data";
import { fmt, fmtSigned } from "@/lib/format";
import { ResIcon, type ResKey } from "@/components/ui/res";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useServerClock } from "@/lib/use-server-clock";

export interface ResourceBarProps {
  serverNow: number;
  res: Record<Resource, number>;
  /** per hour */
  rates: { wood: number; luxury: number; luxuryResource: Exclude<Resource, "wood">; wineUse: number };
  storage: number;
  gold: number;
  goldPerHour: number;
  research: number;
  researchPerHour: number;
  ambrosia: number;
  population: number;
  housing: number;
  freeCitizens: number;
}

/** One swipeable row on phones (keeps the header short), wrapping chips from sm up. */
export const BAR_LAYOUT =
  "flex items-center gap-2.5 overflow-x-auto px-2 py-1 text-[13px] scrollbar-none [mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)] sm:flex-wrap sm:gap-x-3 sm:gap-y-1.5 sm:overflow-visible sm:px-3 sm:py-2 sm:text-sm sm:[mask-image:none] md:gap-x-4";

/**
 * Live HUD. Interpolates production between server snapshots so numbers move in real time; when a
 * new snapshot arrives after an action, the numbers count to the new value with a "+N" float.
 * Each stored resource shows how full the warehouse is, which also works on touch.
 */
export function ResourceBar(props: ResourceBarProps) {
  const now = useServerClock(props.serverNow);
  const elapsedH = (now - props.serverNow) / 3_600_000;
  const key = props.serverNow;

  const perHour = (r: Resource) => {
    let v = 0;
    if (r === "wood") v += props.rates.wood;
    if (r === props.rates.luxuryResource) v += props.rates.luxury;
    if (r === "wine") v -= props.rates.wineUse;
    return v;
  };
  const live = (r: Resource) => Math.max(0, Math.min(props.storage, props.res[r] + perHour(r) * elapsedH));
  // Ignore the drift of live production; only real jumps (costs, deliveries, loot) float.
  const minDelta = (rate: number) => 2 + Math.abs(rate) / 1200;

  return (
    <div className={clsx("panel-glass", BAR_LAYOUT)}>
      {RESOURCES.map((r) => {
        const value = live(r);
        const rate = perHour(r);
        const fill = props.storage > 0 ? value / props.storage : 0;
        const full = value >= props.storage - 0.5;
        return (
          <Stat
            key={r}
            kind={r}
            title={`${RESOURCE_INFO[r].label}: ${fmt(value)} de ${fmt(props.storage)}${rate ? ` (${fmtSigned(rate)}/h)` : ""}${full ? ". Depósito lleno" : ""}`}
            full={full}
            fill={fill}
            rate={rate}
          >
            <AnimatedNumber value={value} animateKey={key} minDelta={minDelta(rate)} float className={full ? "text-gold" : "text-foam"} />
            <span className="sr-only">
              {" "}
              de {fmt(props.storage)}
              {full ? ", depósito lleno" : ""}
            </span>
          </Stat>
        );
      })}
      <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-gradient-to-b from-transparent via-foam/30 to-transparent sm:block" />
      <Stat kind="gold" title={`Oro (${fmtSigned(props.goldPerHour)}/h)`} rate={props.goldPerHour}>
        <AnimatedNumber
          value={Math.max(0, props.gold + props.goldPerHour * elapsedH)}
          animateKey={key}
          minDelta={minDelta(props.goldPerHour)}
          float
          className="text-gold"
        />
      </Stat>
      <Stat
        kind="citizens"
        title={`Ciudadanos: ${fmt(props.freeCitizens)} libres de ${fmt(props.population)} (viviendas: ${fmt(props.housing)})`}
        fill={props.housing > 0 ? props.population / props.housing : undefined}
      >
        <AnimatedNumber value={props.freeCitizens} animateKey={key} float className="text-foam" />
        <span className="font-normal text-foam/60">
          <span className="hidden sm:inline">
            {" "}
            / <span className="tabular">{fmt(props.population)}</span>
          </span>
          <span className="sr-only sm:hidden"> libres de {fmt(props.population)}</span>
        </span>
      </Stat>
      <Stat kind="research" title="Puntos de investigación">
        <AnimatedNumber
          value={props.research + props.researchPerHour * elapsedH}
          animateKey={key}
          minDelta={minDelta(props.researchPerHour)}
          float
          className="text-foam"
        />
      </Stat>
      <Stat kind="ambrosia" title="Ambrosía">
        <AnimatedNumber value={props.ambrosia} animateKey={key} float className="text-shimmer-ambrosia" />
      </Stat>
    </div>
  );
}

function Stat({
  kind,
  title,
  full,
  fill,
  rate,
  children,
}: {
  kind: ResKey;
  title: string;
  full?: boolean;
  fill?: number;
  rate?: number;
  children: ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, fill ?? 0));
  return (
    <span
      title={title}
      className={clsx(
        "relative flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 sm:gap-1.5",
        full && "at-cap bg-gold/10",
      )}
    >
      <ResIcon kind={kind} size={22} className="size-[18px] sm:size-[22px]" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-bold whitespace-nowrap">{children}</span>
        {fill !== undefined && (
          <span aria-hidden className="mt-0.5 h-[3px] w-full min-w-7 overflow-hidden rounded-full bg-foam/15">
            <span
              className={clsx(
                "block h-full w-full origin-left rounded-full transition-[transform,background-color] duration-700 ease-out",
                full ? "bg-gold" : pct >= 0.85 ? "bg-bronze-light" : "bg-sea-300/90",
              )}
              style={{ transform: `scaleX(${pct})` }}
            />
          </span>
        )}
      </span>
      {rate !== undefined && rate !== 0 && (
        <span className={clsx("tabular hidden self-start pt-px text-xs lg:inline", rate > 0 ? "text-sea-300" : "text-danger-soft")}>
          {fmtSigned(rate)}
        </span>
      )}
    </span>
  );
}
