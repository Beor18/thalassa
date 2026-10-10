import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { BUILDINGS, RESOURCE_INFO } from "@/game/data";
import { CONSTRUCTION_IMAGE } from "@/game/layout";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { ResIcon, type ResKey } from "@/components/ui/res";
import { fmt, fmt1, fmtSigned } from "@/lib/format";
import type { Game } from "@/server/game-context";
import { slotHref, unitCount } from "./lib";

/** Compact card next to (desktop) or under (mobile) the scene: current works and what the city makes. */
export function CityStatus({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const r = city.rates;
  const work = city.construction;
  const training = [...city.training].sort((a, b) => a.endsAt - b.endsAt);
  const barracks = city.buildings.find((b) => b.type === "barracks");
  const goldNet = r.goldIncome - r.goldUpkeep;
  const wineNet = (r.luxuryResource === "wine" ? r.luxury : 0) - r.wineUse;

  return (
    <div className="panel flex flex-col gap-4 p-4">
      <section aria-labelledby="works-title" className="flex flex-col gap-2.5">
        <h2 id="works-title" className="font-display text-base font-bold">
          Obras
        </h2>
        {work ? (
          <Link
            href={slotHref(city.id, work.slot)}
            scroll={false}
            className="group flex items-center gap-3 rounded-xl border border-parchment-3 bg-parchment-2/60 p-2.5 transition-colors duration-100 hover:bg-parchment-2"
          >
            <Image src={CONSTRUCTION_IMAGE} alt="" width={112} height={112} sizes="56px" className="sprite size-14 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">
                  {BUILDINGS[work.type].name} · nivel {work.targetLevel}
                </span>
                <span className="shrink-0 text-sm font-extrabold text-bronze-dark">
                  <Countdown endsAt={work.endsAt} serverNow={snapshot.now} />
                </span>
              </span>
              <TimeProgress startedAt={work.startedAt} endsAt={work.endsAt} serverNow={snapshot.now} />
              <span className="text-xs font-bold text-ink-soft group-hover:text-ink">Ver obra</span>
            </span>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-parchment-3 p-3">
            <p className="font-bold">Sin obras en marcha</p>
            <p className="text-sm text-ink-soft">Tocá un lugar con + para construir o un edificio para mejorarlo.</p>
          </div>
        )}
        {training.length > 0 && barracks && (
          <Link
            href={slotHref(city.id, barracks.slot)}
            scroll={false}
            className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm hover:bg-ink/5"
          >
            <span className="min-w-0 truncate">
              Entrenando {unitCount(training[0].unit, training[0].count)}
              {training.length > 1 ? ` y ${training.length - 1} más` : ""}
            </span>
            <span className="shrink-0 font-bold text-ink-soft">
              <Countdown endsAt={training[training.length - 1].endsAt} serverNow={snapshot.now} />
            </span>
          </Link>
        )}
      </section>

      <section aria-labelledby="city-summary-title" className="flex flex-col gap-2.5">
        <h2 id="city-summary-title" className="font-display text-base font-bold">
          La ciudad hoy
        </h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
          <Row icon="citizens" label="Población" value={`${fmt(city.population)} / ${fmt(r.housing)}`} />
          <Row
            label="Satisfacción"
            value={fmtSigned(r.netHappiness)}
            tone={r.netHappiness < 0 ? "bad" : undefined}
            glyph={r.netHappiness >= 0 ? "☺" : "☹"}
          />
          <Row icon="wood" label="Madera" value={`+${fmt1(r.wood)}/h`} />
          <Row
            icon={r.luxuryResource}
            label={RESOURCE_INFO[r.luxuryResource].label}
            value={r.luxuryResource === "wine" ? `${wineNet >= 0 ? "+" : "−"}${fmt1(Math.abs(wineNet))}/h` : `+${fmt1(r.luxury)}/h`}
            tone={r.luxuryResource === "wine" && wineNet < 0 ? "bad" : undefined}
          />
          {r.luxuryResource !== "wine" && r.wineUse > 0 && (
            <Row icon="wine" label="Vino" value={`−${fmt1(r.wineUse)}/h`} tone="bad" />
          )}
          <Row icon="research" label="Investigación" value={`+${fmt1(r.research)}/h`} />
          <Row icon="gold" label="Oro" value={`${fmtSigned(goldNet)}/h`} tone={goldNet < 0 ? "bad" : undefined} />
        </dl>
      </section>
    </div>
  );
}

function Row({
  icon,
  glyph,
  label,
  value,
  tone,
}: {
  icon?: ResKey;
  glyph?: string;
  label: string;
  value: string;
  tone?: "bad";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon ? (
        <ResIcon kind={icon} size={22} />
      ) : (
        <span aria-hidden className="grid size-[22px] shrink-0 place-items-center text-lg leading-none text-bronze-dark">
          {glyph}
        </span>
      )}
      <div className="min-w-0">
        <dt className="truncate text-xs text-ink-soft">{label}</dt>
        <dd className={clsx("font-extrabold tabular", tone === "bad" && "text-danger")}>{value}</dd>
      </div>
    </div>
  );
}
