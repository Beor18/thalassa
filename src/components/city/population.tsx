import clsx from "clsx";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1 } from "@/lib/format";
import { Meter } from "./bits";
import { IconUp } from "./icons";

/** "124 / 255" with a housing bar and the growth per hour. Used by the town hall and the city summary. */
export function PopulationBar({ population, housing, growth }: { population: number; housing: number; growth: number }) {
  const full = population >= housing - 0.5;
  const tone = full ? "text-bronze-dark" : growth > 0.05 ? "text-success" : growth < -0.05 ? "text-danger" : "text-ink-soft";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <ResIcon kind="citizens" size={22} />
          <span className="text-[17px] leading-tight font-extrabold tabular">
            {fmt(population)}
            <span className="text-sm font-bold text-ink-soft"> / {fmt(housing)}</span>
          </span>
          <span className="sr-only">habitantes de {fmt(housing)} viviendas.</span>
        </span>
        <span className={clsx("inline-flex shrink-0 items-center gap-0.5 text-sm font-extrabold tabular", tone)}>
          {full ? (
            "Ciudad llena"
          ) : (
            <>
              {growth > 0.05 && <IconUp size={13} />}
              {growth > 0.05 ? `+${fmt1(growth)}` : growth < -0.05 ? `−${fmt1(Math.abs(growth))}` : "0"}/h
              <span className="sr-only"> habitantes por hora</span>
            </>
          )}
        </span>
      </div>
      <Meter value={population} max={housing} />
    </div>
  );
}
