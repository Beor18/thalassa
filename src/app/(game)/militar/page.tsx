import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import clsx from "clsx";
import { countUnits, militaryPower, unitUpkeep } from "@/game/engine";
import { getGame } from "@/server/game-context";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { IconSwords } from "@/components/island/icons";
import { ResIcon } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { stagger } from "@/components/motion/reveal";
import { CityForces, ForcesStepCard, MissionCard, missionEventAt, nextForcesStep } from "@/components/military/forces";
import { ShipPortrait, UnitPortrait } from "@/components/military/units";
import { HeroStat, SECTION_WIDE } from "@/components/tesoro/section-ui";

export const metadata: Metadata = { title: "Flota y tropas" };

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <MilitaryContent />
    </Suspense>
  );
}

async function MilitaryContent() {
  const game = await getGame();
  const { snapshot, city } = game;
  const missions = [...snapshot.missions].sort((a, b) => missionEventAt(a) - missionEventAt(b));
  const home = snapshot.cities.reduce((s, c) => s + countUnits(c.units), 0);
  const away = missions.reduce((s, m) => s + countUnits(m.units), 0);
  const power = snapshot.cities.reduce((s, c) => s + militaryPower(c.units), 0);
  const docked = snapshot.cities.reduce((s, c) => s + c.ships, 0);
  const atSea = missions.reduce((s, m) => s + m.ships, 0);
  const training = snapshot.cities.reduce((s, c) => s + c.training.reduce((t, b) => t + b.count, 0), 0);
  const upkeep = (snapshot.cities.reduce((s, c) => s + unitUpkeep(c.units), 0) + snapshot.player.awayUpkeep) * snapshot.speed;
  const shipsAtSeaFrom = (cityId: string) => missions.filter((m) => m.originCityId === cityId).reduce((s, m) => s + m.ships, 0);
  const awayFrom = (cityId: string) => missions.filter((m) => m.originCityId === cityId).reduce((s, m) => s + countUnits(m.units), 0);
  const step = nextForcesStep(city, shipsAtSeaFrom(city.id), awayFrom(city.id));
  const many = snapshot.cities.length > 1;

  return (
    <GameShell game={game}>
      <div className={SECTION_WIDE}>
        <section
          aria-labelledby="forces-title"
          className="panel-dark rise-in relative flex flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-5"
        >
          <span aria-hidden className="pointer-events-none absolute -top-20 -left-10 size-56 rounded-full bg-terracotta/20 blur-3xl" />
          <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-3">
              <Image src="/assets/u-hoplite.webp" alt="" width={56} height={56} loading="eager" className="sprite size-12 shrink-0 sm:size-14" />
              <div className="leading-none">
                <h1 id="forces-title" className="font-display text-xs font-bold tracking-[0.25em] text-sea-300 uppercase">
                  Flota y tropas
                </h1>
                <p className="mt-1 font-display text-3xl font-black text-foam sm:text-4xl" title="Poder de las tropas que están en casa">
                  {fmt(power)} <span className="text-sm font-bold text-foam/70">de poder</span>
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
              <HeroStat
                icon={<UnitPortrait unit="spearman" size={30} className="bg-transparent" />}
                value={away > 0 ? `${fmt(home)} +${fmt(away)}` : fmt(home)}
                label={away > 0 ? "Casa + mar" : "Soldados"}
                hint={`${fmt(home)} soldados en casa${away > 0 ? ` y ${fmt(away)} en el mar` : ""}${training > 0 ? `, ${fmt(training)} entrenando` : ""}`}
              />
              <HeroStat
                icon={<ShipPortrait size={30} />}
                value={atSea > 0 ? `${fmt(docked)} +${fmt(atSea)}` : fmt(docked)}
                label={atSea > 0 ? "Puerto + mar" : "Barcos"}
                hint={`${fmt(docked)} barcos en el puerto${atSea > 0 ? ` y ${fmt(atSea)} en el mar` : ""}`}
              />
              {training > 0 && (
                <HeroStat icon={<IconSwords size={20} className="text-gold" />} value={fmt(training)} label="Entrenando" hint={`${fmt(training)} soldados entrenando`} />
              )}
              <HeroStat
                icon={<ResIcon kind="gold" size={24} />}
                value={
                  upkeep > 0 ? (
                    <>
                      −{fmt(upkeep)}
                      <span className="font-body text-xs font-bold">/h</span>
                    </>
                  ) : (
                    "0"
                  )
                }
                label="Sueldos"
                hint="Oro por hora que cobran tus tropas"
                tone={upkeep > 0 ? "bad" : "default"}
              />
            </div>
          </div>
          <ForcesStepCard step={step} now={snapshot.now} />
        </section>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] 2xl:grid-cols-[minmax(0,1fr)_30rem]">
          <section aria-labelledby="cities-title" className="rise-in flex min-w-0 flex-col gap-2" style={stagger(1, 80, 3, 40)}>
            <h2 id="cities-title" className="font-display text-lg font-bold text-foam drop-shadow">
              {many ? "Tus ciudades" : "Tu ciudad"}
            </h2>
            <div className={clsx("grid items-start gap-3", many && "lg:grid-cols-2")}>
              {snapshot.cities.map((c) => (
                <CityForces key={c.id} city={c} speed={snapshot.speed} now={snapshot.now} shipsAtSea={shipsAtSeaFrom(c.id)} quiet={c.id === city.id} />
              ))}
            </div>
          </section>

          <section aria-labelledby="sea-title" className="rise-in flex min-w-0 flex-col gap-2" style={stagger(2, 80, 3, 40)}>
            <h2 id="sea-title" className="flex items-baseline gap-2 font-display text-lg font-bold text-foam drop-shadow">
              En el mar
              {missions.length > 0 && <span className="font-body text-sm font-bold text-foam/70 tabular">{missions.length}</span>}
            </h2>
            {missions.length ? (
              <ul className={clsx("grid gap-2", !many && "md:grid-cols-2 xl:grid-cols-1")}>
                {missions.map((m, i) => (
                  <MissionCard key={m.id} mission={m} now={snapshot.now} index={i} />
                ))}
              </ul>
            ) : (
              <div className="panel-glass flex items-center gap-3 px-3 py-2.5 text-sm text-foam/85">
                <ShipPortrait size={40} className="opacity-80" />
                Ningún barco navegando.
              </div>
            )}
          </section>
        </div>
      </div>
    </GameShell>
  );
}
