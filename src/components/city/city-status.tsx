import Image from "next/image";
import Link from "next/link";
import { BUILDINGS, RESOURCE_INFO } from "@/game/data";
import { CONSTRUCTION_IMAGE } from "@/game/layout";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt1, fmtDuration, fmtSigned } from "@/lib/format";
import type { Game } from "@/server/game-context";
import { SectionTitle, Stat, StatGrid } from "./bits";
import { readyUpgrades } from "./effects";
import { FaceIcon, IconChevron, IconHammer, IconSword, IconUp } from "./icons";
import { asPlayer, slotHref, unitCount } from "./lib";
import { PopulationBar } from "./population";

const MAX_READY = 4;
const perHour = (n: number) => `${n > 0.05 ? "+" : n < -0.05 ? "−" : ""}${fmt1(Math.abs(n))}/h`;

/** Card next to (desktop) or under (phones) the scene: the work in progress or what is ready to upgrade, and the city at a glance. */
export function CityStatus({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const r = city.rates;
  const work = city.construction;
  const training = [...city.training].sort((a, b) => a.endsAt - b.endsAt);
  const barracks = city.buildings.find((b) => b.type === "barracks");
  const ready = readyUpgrades(asPlayer(snapshot), city, snapshot.speed);
  const goldNet = r.goldIncome - r.goldUpkeep;
  const lux = r.luxuryResource;

  return (
    <div className="panel flex flex-col gap-3 p-3.5">
      <section aria-labelledby="works-title" className="flex flex-col gap-2">
        <SectionTitle as="h2" id="works-title" aside={work ? undefined : ready.length ? `${ready.length} para mejorar` : "sin obras"}>
          Obras
        </SectionTitle>
        {work ? (
          <Link
            href={slotHref(city.id, work.slot)}
            scroll={false}
            className="group flex items-center gap-3 rounded-xl border border-gold/60 bg-gradient-to-b from-gold/20 to-parchment-2/60 p-2 transition-colors duration-100 hover:border-bronze"
          >
            <Image src={CONSTRUCTION_IMAGE} alt="" width={112} height={112} sizes="48px" className="sprite size-12 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">
                  {BUILDINGS[work.type].name}
                  <span className="font-bold text-ink-soft"> · nivel {work.targetLevel}</span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-bronze-dark">
                  <Countdown endsAt={work.endsAt} serverNow={snapshot.now} />
                </span>
              </span>
              <TimeProgress startedAt={work.startedAt} endsAt={work.endsAt} serverNow={snapshot.now} />
            </span>
            <IconChevron size={16} className="shrink-0 text-ink-soft transition-transform duration-100 group-hover:translate-x-0.5" />
          </Link>
        ) : ready.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Edificios que podés mejorar ya">
            {ready.slice(0, MAX_READY).map((o) => (
              <li key={o.slot}>
                <Link
                  href={slotHref(city.id, o.slot)}
                  scroll={false}
                  className="group flex min-h-11 items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors duration-100 hover:bg-parchment-2/80"
                >
                  <Image src={BUILDINGS[o.type].image} alt="" width={80} height={80} sizes="36px" className="sprite size-9 shrink-0 object-contain" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1 truncate text-sm font-bold">
                      {BUILDINGS[o.type].name}
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success/15 px-1.5 text-xs font-extrabold text-success">
                        <IconUp size={11} />
                        {o.next}
                        <span className="sr-only">: mejorar a nivel {o.next}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-ink-soft">
                      <CostList cost={o.cost} className="gap-x-2 text-xs [&_img]:size-3.5" />
                      <span className="tabular">{fmtDuration(o.seconds * 1000)}</span>
                    </span>
                  </span>
                  <IconChevron size={16} className="shrink-0 text-ink-soft transition-transform duration-100 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
            {ready.length > MAX_READY && <li className="px-1 text-xs text-ink-soft">y {ready.length - MAX_READY} más, marcados en el mapa</li>}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-parchment-3 px-3 py-2 text-sm text-ink-soft">
            <IconHammer size={16} className="shrink-0 text-bronze-dark" />
            Tocá un edificio para mejorarlo o un ＋ para construir.
          </p>
        )}
        {training.length > 0 && barracks && (
          <Link
            href={slotHref(city.id, barracks.slot)}
            scroll={false}
            className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-1 text-sm hover:bg-ink/5"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <IconSword size={15} className="shrink-0 text-terracotta" />
              <span className="truncate">
                Entrenando {unitCount(training[0].unit, training[0].count)}
                {training.length > 1 ? ` y ${training.length - 1} más` : ""}
              </span>
            </span>
            <span className="shrink-0 font-bold text-ink-soft">
              <Countdown endsAt={training[training.length - 1].endsAt} serverNow={snapshot.now} />
            </span>
          </Link>
        )}
      </section>

      <section aria-labelledby="city-summary-title" className="flex flex-col gap-2 border-t border-parchment-3/70 pt-3">
        <SectionTitle as="h2" id="city-summary-title" aside="por hora">
          Ciudad
        </SectionTitle>
        <PopulationBar population={city.population} housing={r.housing} growth={r.growth} />
        <StatGrid>
          <Stat
            icon={<FaceIcon happy={r.netHappiness >= 0} />}
            label="Satisfacción"
            value={fmtSigned(r.netHappiness)}
            tone={r.netHappiness < 0 ? "bad" : undefined}
          />
          <Stat icon={<ResIcon kind="research" size={20} />} label="Investigación" value={perHour(r.research)} />
          <Stat icon={<ResIcon kind="gold" size={20} />} label="Oro" value={perHour(goldNet)} tone={goldNet < 0 ? "bad" : undefined} />
          <Stat icon={<ResIcon kind="wood" size={20} />} label="Madera" value={perHour(r.wood)} />
          <Stat
            icon={<ResIcon kind={lux} size={20} />}
            label={RESOURCE_INFO[lux].label}
            value={perHour(lux === "wine" ? r.luxury - r.wineUse : r.luxury)}
            tone={lux === "wine" && r.luxury - r.wineUse < -0.05 ? "bad" : undefined}
          />
          {lux !== "wine" && r.wineUse > 0 && <Stat icon={<ResIcon kind="wine" size={20} />} label="Vino" value={perHour(-r.wineUse)} tone="bad" />}
        </StatGrid>
      </section>
    </div>
  );
}
