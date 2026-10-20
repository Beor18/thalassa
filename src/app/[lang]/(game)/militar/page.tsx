import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import clsx from "clsx";
import { isNaval } from "@/game/data";
import { countLand, countNaval, militaryPower, unitUpkeep } from "@/game/engine";
import { getGame } from "@/server/game-context";
import { getIsland } from "@/server/queries";
import { getI18n } from "@/i18n/server";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { IconSwords } from "@/components/island/icons";
import { ResIcon } from "@/components/ui/res";
import { stagger } from "@/components/motion/reveal";
import { CityForces, ForcesStepCard, MissionCard, missionEventAt, nextForcesStep } from "@/components/military/forces";
import { ShipPortrait, UnitPortrait } from "@/components/military/units";
import { HeroStat, SECTION_WIDE } from "@/components/tesoro/section-ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Fleet & troops", es: "Flota y tropas" }) };
}

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <MilitaryContent />
    </Suspense>
  );
}

async function MilitaryContent() {
  const [game, { t, lang, fmt }] = await Promise.all([getGame(), getI18n()]);
  const { snapshot, city } = game;
  const missions = [...snapshot.missions].sort((a, b) => missionEventAt(a) - missionEventAt(b));
  // Soldiers and warships are counted apart; `docked` and `atSea` are merchant ships.
  const home = snapshot.cities.reduce((s, c) => s + countLand(c.units), 0);
  const away = missions.reduce((s, m) => s + countLand(m.units), 0);
  const power = snapshot.cities.reduce((s, c) => s + militaryPower(c.units), 0);
  const docked = snapshot.cities.reduce((s, c) => s + c.ships, 0);
  const atSea = missions.reduce((s, m) => s + m.ships, 0);
  const batches = snapshot.cities.flatMap((c) => c.training);
  const training = batches.reduce((s, b) => s + (isNaval(b.unit) ? 0 : b.count), 0);
  const warshipsHome = snapshot.cities.reduce((s, c) => s + countNaval(c.units), 0);
  const warshipsAway = missions.reduce((s, m) => s + countNaval(m.units), 0);
  const warshipsBuilding = batches.reduce((s, b) => s + (isNaval(b.unit) ? b.count : 0), 0);
  const upkeep = (snapshot.cities.reduce((s, c) => s + unitUpkeep(c.units), 0) + snapshot.player.awayUpkeep) * snapshot.speed;
  const shipsAtSeaFrom = (cityId: string) => missions.filter((m) => m.originCityId === cityId).reduce((s, m) => s + m.ships, 0);
  const awayFrom = (cityId: string) => missions.filter((m) => m.originCityId === cityId).reduce((s, m) => s + countLand(m.units), 0);
  // Read only for the camp's rearm timer, so the hero never sends troops to an empty camp.
  const island = await getIsland(city.islandId, snapshot.player.id);
  const step = nextForcesStep({
    city,
    shipsAtSea: shipsAtSeaFrom(city.id),
    soldiersAway: awayFrom(city.id),
    missions,
    campRearmsAt: island?.barbarians.rebuildingUntil ?? null,
    lang,
  });
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
                  {t({ en: "Fleet & troops", es: "Flota y tropas" })}
                </h1>
                <p
                  className="mt-1 font-display text-3xl font-black text-foam sm:text-4xl"
                  title={t({ en: "Power of the troops and warships at home", es: "Poder de las tropas y barcos de guerra que están en casa" })}
                >
                  {fmt(power)} <span className="text-sm font-bold text-foam/70">{t({ en: "power", es: "de poder" })}</span>
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
              <HeroStat
                icon={<UnitPortrait unit="spearman" size={30} className="bg-transparent" />}
                value={fmt(home)}
                label={t({ en: "At home", es: "En casa" })}
                hint={
                  home === 1
                    ? t({ en: "1 soldier at home", es: "1 soldado en casa" })
                    : t({ en: `${fmt(home)} soldiers at home`, es: `${fmt(home)} soldados en casa` })
                }
              />
              {away > 0 && (
                <HeroStat
                  icon={<UnitPortrait unit="spearman" size={30} className="bg-transparent opacity-70" />}
                  value={fmt(away)}
                  label={t({ en: "At sea", es: "En el mar" })}
                  hint={
                    away === 1
                      ? t({ en: "1 soldier sailing", es: "1 soldado navegando" })
                      : t({ en: `${fmt(away)} soldiers sailing`, es: `${fmt(away)} soldados navegando` })
                  }
                />
              )}
              <HeroStat
                icon={<ShipPortrait size={30} />}
                value={fmt(docked)}
                label={t({ en: "In port", es: "En puerto" })}
                hint={
                  docked === 1
                    ? t({
                        en: `1 merchant ship in port${atSea > 0 ? ` and ${fmt(atSea)} at sea` : ""}`,
                        es: `1 mercante en el puerto${atSea > 0 ? ` y ${fmt(atSea)} en el mar` : ""}`,
                      })
                    : t({
                        en: `${fmt(docked)} merchant ships in port${atSea > 0 ? ` and ${fmt(atSea)} at sea` : ""}`,
                        es: `${fmt(docked)} mercantes en el puerto${atSea > 0 ? ` y ${fmt(atSea)} en el mar` : ""}`,
                      })
                }
              />
              {warshipsHome + warshipsAway + warshipsBuilding > 0 && (
                <HeroStat
                  icon={<UnitPortrait unit="trireme" size={30} className="bg-transparent" />}
                  value={fmt(warshipsHome)}
                  label={t({ en: "Warships", es: "De guerra" })}
                  hint={t({
                    en: `${fmt(warshipsHome)} warships in port${warshipsAway > 0 ? `, ${fmt(warshipsAway)} at sea` : ""}${warshipsBuilding > 0 ? `, ${fmt(warshipsBuilding)} in the shipyard` : ""}`,
                    es: `${fmt(warshipsHome)} barcos de guerra en el puerto${warshipsAway > 0 ? `, ${fmt(warshipsAway)} en el mar` : ""}${warshipsBuilding > 0 ? `, ${fmt(warshipsBuilding)} en el astillero` : ""}`,
                  })}
                />
              )}
              {training > 0 && (
                <HeroStat
                  icon={<IconSwords size={20} className="text-gold" />}
                  value={fmt(training)}
                  label={t({ en: "Training", es: "Entrenando" })}
                  hint={
                    training === 1
                      ? t({ en: "1 soldier training", es: "1 soldado entrenando" })
                      : t({ en: `${fmt(training)} soldiers training`, es: `${fmt(training)} soldados entrenando` })
                  }
                />
              )}
              <HeroStat
                icon={<ResIcon kind="gold" size={24} />}
                value={
                  <>
                    {upkeep > 0 ? `−${fmt(upkeep)}` : "0"}
                    <span className="font-body text-xs font-bold">/h</span>
                  </>
                }
                label={t({ en: "Wages", es: "Sueldos" })}
                hint={t({ en: "Gold your troops and crews are paid per hour", es: "Oro por hora que cobran tus tropas y tripulaciones" })}
                tone={upkeep > 0 ? "bad" : "default"}
              />
            </div>
          </div>
          <ForcesStepCard step={step} now={snapshot.now} cityName={many ? city.name : undefined} />
        </section>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] 2xl:grid-cols-[minmax(0,1fr)_30rem]">
          <section aria-labelledby="cities-title" className="rise-in flex min-w-0 flex-col gap-2" style={stagger(1, 80, 3, 40)}>
            <h2 id="cities-title" className="font-display text-lg font-bold text-foam drop-shadow">
              {many ? t({ en: "Your cities", es: "Tus ciudades" }) : t({ en: "Your city", es: "Tu ciudad" })}
            </h2>
            <div className={clsx("grid items-start gap-3", many && "lg:grid-cols-2")}>
              {snapshot.cities.map((c) => (
                <CityForces key={c.id} city={c} speed={snapshot.speed} now={snapshot.now} shipsAtSea={shipsAtSeaFrom(c.id)} quiet={c.id === city.id} />
              ))}
            </div>
          </section>

          <section aria-labelledby="sea-title" className="rise-in flex min-w-0 flex-col gap-2" style={stagger(2, 80, 3, 40)}>
            <h2 id="sea-title" className="flex items-baseline gap-2 font-display text-lg font-bold text-foam drop-shadow">
              {t({ en: "At sea", es: "En el mar" })}
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
                {t({ en: "No ships at sea.", es: "Ningún barco navegando." })}
              </div>
            )}
          </section>
        </div>
      </div>
    </GameShell>
  );
}
