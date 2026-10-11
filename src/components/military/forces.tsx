import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { CITY_SLOTS, RESOURCES, type Resource } from "@/game/data";
import { buildingLevel, countUnits, militaryPower, unitUpkeep, type CityState } from "@/game/engine";
import { buildingName, unitName } from "@/game/names";
import type { Locale, Text } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import type { GameCity } from "@/server/game-context";
import type { MissionView } from "@/server/queries";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { stagger } from "@/components/motion/reveal";
import { IconArrowRight, IconSwords } from "@/components/island/icons";
import { ShipPortrait, UnitPortrait, UnitStrip } from "./units";

const freeLandSlot = (c: CityState) =>
  CITY_SLOTS.find((s) => s.kind === "land" && !c.buildings.some((b) => b.slot === s.slot))?.slot ?? 1;
const freeCoastSlot = (c: CityState) =>
  CITY_SLOTS.find((s) => s.kind === "coast" && !c.buildings.some((b) => b.slot === s.slot))?.slot ?? 12;
const slotOf = (c: CityState, type: CityState["buildings"][number]["type"]) => c.buildings.find((b) => b.type === type)?.slot;
/** The building being raised for the first time (level 1), if it is this type. */
const buildingFirst = (c: CityState, type: CityState["buildings"][number]["type"]) =>
  c.construction && c.construction.type === type && buildingLevel(c, type) === 0 ? c.construction : null;

// ---------------------------------------------------------------------------
// The one thing to do next (hero call to action)
// ---------------------------------------------------------------------------

export type ForcesStep =
  | { kind: "link"; eyebrow: string; title: string; cta: string; href: string; art: string }
  | { kind: "wait"; eyebrow: string; title: string; endsAt: number; waitLabel: string; href: string; art: string };

/**
 * What a player should do next with the city in focus, in the order the game unlocks it:
 * Cuartel, first troops, Puerto, a ship, then the barbarian camp of the island (unless an attack
 * is already on its way there or the camp is rearming after a defeat).
 */
export function nextForcesStep({
  city,
  shipsAtSea,
  soldiersAway,
  missions,
  campRearmsAt,
  lang,
}: {
  lang: Locale;
  city: GameCity;
  shipsAtSea: number;
  soldiersAway: number;
  missions: MissionView[];
  /** When the barbarians of this island are back, if they were beaten recently. */
  campRearmsAt: number | null;
}): ForcesStep {
  const home = countUnits(city.units);
  const training = city.training.reduce((s, b) => s + b.count, 0);
  const barracksSlot = slotOf(city, "barracks");
  const portSlot = slotOf(city, "port");
  const camp = `/isla/${city.islandId}?panel=camp`;
  const t = (text: Text) => text[lang];
  const barbarians = t({ en: `Barbarians of ${city.island.name}`, es: `Bárbaros de ${city.island.name}` });
  const doneIn = t({ en: "Done in", es: "Termina en" });
  const trainTroops = t({ en: "Train troops", es: "Entrenar tropas" });

  if (barracksSlot === undefined) {
    const raising = buildingFirst(city, "barracks");
    return raising
      ? {
          kind: "wait",
          eyebrow: t({ en: "Barracks going up", es: "Cuartel en obra" }),
          title: t({ en: "Your troops are coming", es: "Tus tropas, en breve" }),
          endsAt: raising.endsAt,
          waitLabel: doneIn,
          href: `/ciudad/${city.id}`,
          art: "/assets/b-barracks.webp",
        }
      : {
          kind: "link",
          eyebrow: t({ en: "First step", es: "Primer paso" }),
          title: t({ en: "No Barracks, no troops", es: "Sin Cuartel no hay tropas" }),
          cta: t({ en: "Build Barracks", es: "Construir Cuartel" }),
          href: `/ciudad/${city.id}?slot=${freeLandSlot(city)}`,
          art: "/assets/b-barracks.webp",
        };
  }
  if (home + training + soldiersAway === 0) {
    return {
      kind: "link",
      eyebrow: t({ en: "No troops", es: "Sin tropas" }),
      title: t({ en: "Spearmen are cheap and steady", es: "Los lanceros son baratos y firmes" }),
      cta: trainTroops,
      href: `/ciudad/${city.id}?slot=${barracksSlot}`,
      art: "/assets/u-spearman.webp",
    };
  }
  if (portSlot === undefined) {
    const raising = buildingFirst(city, "port");
    return raising
      ? {
          kind: "wait",
          eyebrow: t({ en: "Port going up", es: "Puerto en obra" }),
          title: t({ en: "Your ships are coming", es: "Tus barcos, en breve" }),
          endsAt: raising.endsAt,
          waitLabel: doneIn,
          href: `/ciudad/${city.id}`,
          art: "/assets/b-port.webp",
        }
      : {
          kind: "link",
          eyebrow: t({ en: "No Port", es: "Sin Puerto" }),
          title: t({ en: "No ships, nobody sails", es: "Sin barcos no zarpa nadie" }),
          cta: t({ en: "Build Port", es: "Construir Puerto" }),
          href: `/ciudad/${city.id}?slot=${freeCoastSlot(city)}`,
          art: "/assets/b-port.webp",
        };
  }
  if (city.ships + shipsAtSea === 0) {
    return {
      kind: "link",
      eyebrow: t({ en: "No ships", es: "Sin barcos" }),
      title: t({ en: "They carry troops, settlers and goods", es: "Llevan tropas, colonos y recursos" }),
      cta: t({ en: "Buy a ship", es: "Comprar un barco" }),
      href: `/ciudad/${city.id}?slot=${portSlot}`,
      art: "/assets/u-ship.webp",
    };
  }
  const attack = missions.find((m) => m.kind === "attack" && m.status === "outbound" && m.targetIslandId === city.islandId);
  if (attack) {
    return {
      kind: "wait",
      eyebrow: t({ en: "Attack underway", es: "Ataque en camino" }),
      title: attack.targetLabel,
      endsAt: attack.arrivesAt,
      waitLabel: t({ en: "Arrives in", es: "Llega en" }),
      href: camp,
      art: "/assets/f-barbarians.webp",
    };
  }
  if (home === 0) {
    return {
      kind: "link",
      eyebrow: t({ en: "Nobody home", es: "Nadie en casa" }),
      title: t({ en: "Train more while they're away", es: "Sumá tropas mientras vuelven" }),
      cta: trainTroops,
      href: `/ciudad/${city.id}?slot=${barracksSlot}`,
      art: "/assets/u-spearman.webp",
    };
  }
  if (campRearmsAt !== null) {
    return {
      kind: "wait",
      eyebrow: t({ en: "Camp rearming", es: "Campamento rearmándose" }),
      title: barbarians,
      endsAt: campRearmsAt,
      waitLabel: t({ en: "Back in", es: "Vuelven en" }),
      href: camp,
      art: "/assets/f-barbarians.webp",
    };
  }
  return {
    kind: "link",
    eyebrow: t({ en: "Loot in sight", es: "Botín a la vista" }),
    title: barbarians,
    cta: t({ en: "Go to the camp", es: "Ir al campamento" }),
    href: camp,
    art: "/assets/f-barbarians.webp",
  };
}

/** `cityName`: with more than one city, says which one the step is about. */
export async function ForcesStepCard({ step, now, cityName }: { step: ForcesStep; now: number; cityName?: string }) {
  const { t } = await getI18n();
  return (
    <div
      className="pop-in relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-parchment p-2.5 pl-2 text-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] ring-1 ring-gold/60 lg:w-[28rem] lg:shrink-0"
      style={stagger(0, 0, 0, 200)}
    >
      <Image src={step.art} alt="" width={48} height={48} loading="eager" className="sprite size-12 shrink-0 motion-safe:animate-float" />
      <div className="min-w-[9rem] flex-1">
        <p className="text-[11px] font-extrabold tracking-wider text-bronze-dark uppercase">
          {cityName ? `${cityName} · ${step.eyebrow}` : step.eyebrow}
        </p>
        <p className="font-display text-base leading-tight font-bold sm:text-lg">{step.title}</p>
      </div>
      {step.kind === "link" ? (
        <Link href={step.href} className={buttonClass("primary", "md", "shrink-0 max-sm:w-full")}>
          {step.cta}
        </Link>
      ) : (
        <Link href={step.href} className="shrink-0 rounded-lg text-right leading-tight hover:text-bronze-dark">
          <span className="block text-[11px] font-bold text-ink-soft uppercase">{step.waitLabel}</span>
          <strong className="font-display text-lg">
            <Countdown endsAt={step.endsAt} serverNow={now} doneLabel={t({ en: "a moment", es: "un momento" })} />
          </strong>
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-city forces
// ---------------------------------------------------------------------------

function Meta({ icon, children, title }: { icon: ReactNode; children: ReactNode; title: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1.5">
      {icon}
      <span className="tabular font-bold">{children}</span>
    </span>
  );
}

function SoftEmpty({ children, href, cta }: { children: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-parchment-3 px-3 py-1.5">
      <p className="text-sm text-ink-soft">{children}</p>
      {href && cta && (
        <Link href={href} className={buttonClass("secondary", "sm", "h-10")}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/**
 * One city's troops, ships and training. `quiet`: the hero already shows this city's next step, so
 * the card states what is missing without repeating the button.
 */
export async function CityForces({
  city,
  speed,
  now,
  shipsAtSea,
  quiet = false,
}: {
  city: GameCity;
  speed: number;
  now: number;
  shipsAtSea: number;
  quiet?: boolean;
}) {
  const { t, lang, fmt } = await getI18n();
  const barracksLevel = buildingLevel(city, "barracks");
  const barracksSlot = slotOf(city, "barracks");
  const portSlot = slotOf(city, "port");
  const power = militaryPower(city.units);
  const upkeep = unitUpkeep(city.units) * speed;
  const soldiers = countUnits(city.units);
  const portRaising = buildingFirst(city, "port");
  const barracksRaising = buildingFirst(city, "barracks");
  const hasPort = city.rates.maxShips > 0 || city.ships > 0;

  return (
    <article aria-labelledby={`forces-${city.id}`} className="panel flex flex-col gap-3 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`forces-${city.id}`} className="flex flex-wrap items-center gap-x-2 font-display text-lg leading-tight font-bold">
            <span className="truncate">{city.name}</span>
            {city.isCapital && <span className="rounded-full bg-bronze px-2 py-0.5 font-body text-xs font-extrabold text-marble">Capital</span>}
          </h3>
          <p className="text-sm text-ink-soft">
            {city.island.name}
            {barracksLevel > 0 && ` · ${buildingName("barracks", lang)} ${barracksLevel}`}
          </p>
        </div>
        <Link
          href={`/ciudad/${city.id}`}
          className={buttonClass("secondary", "sm", "h-10 shrink-0")}
          aria-label={t({ en: `Go to ${city.name}`, es: `Ir a ${city.name}` })}
        >
          {t({ en: "Go to city", es: "Ir a la ciudad" })}
          <IconArrowRight size={14} />
        </Link>
      </header>

      {/* A wide card (one city on a big screen) puts training beside the troops. */}
      <div className="@container">
        <div className="grid items-start gap-3 @3xl:grid-cols-2 @3xl:gap-5">
          <div className="flex flex-col gap-3">
            <section aria-label={t({ en: "Troops at home", es: "Tropas en casa" })} className="flex flex-col gap-2">
              <UnitStrip
                units={city.units}
                lang={lang}
                empty={
                  barracksSlot === undefined ? (
                    barracksRaising ? (
                      <SoftEmpty>
                        {t({ en: "Barracks going up", es: "Cuartel en obra" })} ·{" "}
                        <Countdown endsAt={barracksRaising.endsAt} serverNow={now} doneLabel={t({ en: "done", es: "listo" })} />
                      </SoftEmpty>
                    ) : (
                      <SoftEmpty
                        href={quiet ? undefined : `/ciudad/${city.id}?slot=${freeLandSlot(city)}`}
                        cta={t({ en: "Build Barracks", es: "Construir Cuartel" })}
                      >
                        {t({ en: "No Barracks, no troops.", es: "Sin Cuartel, sin tropas." })}
                      </SoftEmpty>
                    )
                  ) : (
                    <SoftEmpty href={quiet ? undefined : `/ciudad/${city.id}?slot=${barracksSlot}`} cta={t({ en: "Train troops", es: "Entrenar tropas" })}>
                      {t({ en: "No troops at home.", es: "No hay tropas en casa." })}
                    </SoftEmpty>
                  )
                }
              />
            </section>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-parchment-3/80 pt-2.5 text-sm">
              <Meta
                icon={<IconSwords size={16} className="text-terracotta" />}
                title={t({ en: `Power at home: ${fmt(power)}`, es: `Poder en casa: ${fmt(power)}` })}
              >
                {fmt(power)}
                <span className="sr-only">{t({ en: " power", es: " de poder" })}</span>
              </Meta>
              {soldiers > 0 && (
                <Meta
                  icon={<ResIcon kind="gold" size={16} />}
                  title={t({ en: `Wages: ${fmt(upkeep)} gold per hour`, es: `Sueldos: ${fmt(upkeep)} de oro por hora` })}
                >
                  −{fmt(upkeep)}/h
                  <span className="sr-only">{t({ en: " gold in wages", es: " de oro en sueldos" })}</span>
                </Meta>
              )}
              {hasPort ? (
                <Meta
                  icon={<ShipPortrait size={24} />}
                  title={
                    city.ships === 1
                      ? t({
                          en: `1 ship in port (berths for ${fmt(city.rates.maxShips)})${shipsAtSea ? `, ${fmt(shipsAtSea)} at sea` : ""}`,
                          es: `1 barco en el puerto (amarras para ${fmt(city.rates.maxShips)})${shipsAtSea ? `, ${fmt(shipsAtSea)} en el mar` : ""}`,
                        })
                      : t({
                          en: `${fmt(city.ships)} ships in port (berths for ${fmt(city.rates.maxShips)})${shipsAtSea ? `, ${fmt(shipsAtSea)} at sea` : ""}`,
                          es: `${fmt(city.ships)} barcos en el puerto (amarras para ${fmt(city.rates.maxShips)})${shipsAtSea ? `, ${fmt(shipsAtSea)} en el mar` : ""}`,
                        })
                  }
                >
                  {fmt(city.ships)} <span className="font-normal">{t({ en: "in port", es: "en puerto" })}</span>
                  {shipsAtSea > 0 && (
                    <span className="font-normal text-ink-soft">
                      {" "}
                      · {t({ en: `${fmt(shipsAtSea)} at sea`, es: `${fmt(shipsAtSea)} en el mar` })}
                    </span>
                  )}
                </Meta>
              ) : portRaising ? (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <ShipPortrait size={24} className="opacity-60" />
                  {t({ en: "Port going up", es: "Puerto en obra" })} ·{" "}
                  <Countdown endsAt={portRaising.endsAt} serverNow={now} doneLabel={t({ en: "done", es: "listo" })} />
                </span>
              ) : quiet ? (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <ShipPortrait size={24} className="opacity-60" />
                  {t({ en: "No Port", es: "Sin Puerto" })}
                </span>
              ) : (
                <Link
                  href={`/ciudad/${city.id}?slot=${portSlot ?? freeCoastSlot(city)}`}
                  className="inline-flex min-h-10 items-center gap-1.5 font-bold text-bronze-dark underline-offset-4 hover:underline"
                >
                  <ShipPortrait size={24} className="opacity-60" />
                  {t({ en: "Build Port", es: "Construir Puerto" })}
                </Link>
              )}
            </div>
          </div>

          {city.training.length > 0 && (
            <section aria-labelledby={`training-${city.id}`} className="flex flex-col gap-1.5">
              <h4 id={`training-${city.id}`} className="text-[11px] font-extrabold tracking-wider text-bronze-dark uppercase">
                {t({ en: "Training", es: "Entrenando" })}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {city.training.map((b) => {
                  const waiting = b.startedAt > now;
                  return (
                    <li key={b.id} className="flex items-center gap-2.5 rounded-xl bg-parchment-2/60 py-1.5 pr-3 pl-1.5 ring-1 ring-parchment-3">
                      <UnitPortrait unit={b.unit} size={36} className="bg-transparent" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-bold">
                            {fmt(b.count)} {unitName(b.unit, lang, b.count)}
                          </span>
                          <span className="tabular shrink-0 text-ink-soft">
                            {waiting ? t({ en: "Queued · ", es: "En cola · " }) : ""}
                            <Countdown endsAt={b.endsAt} serverNow={now} doneLabel={t({ en: "Ready", es: "Listas" })} />
                          </span>
                        </div>
                        <TimeProgress startedAt={b.startedAt} endsAt={b.endsAt} serverNow={now} className="mt-1" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Missions at sea
// ---------------------------------------------------------------------------

const KIND: Record<MissionView["kind"], { label: Text; className: string }> = {
  transport: { label: { en: "Transport", es: "Transporte" }, className: "bg-sea-700 text-foam" },
  attack: { label: { en: "Attack", es: "Ataque" }, className: "bg-terracotta text-marble" },
  colonize: { label: { en: "Colony", es: "Colonia" }, className: "bg-olive text-marble" },
};

export const missionEventAt = (m: MissionView) => (m.status === "outbound" ? m.arrivesAt : (m.returnsAt ?? m.arrivesAt));

export async function MissionCard({ mission: m, now, index = 0 }: { mission: MissionView; now: number; index?: number }) {
  const { t, lang, fmt } = await getI18n();
  const outbound = m.status === "outbound";
  const kind = KIND[m.kind];
  const cargo: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    const n = Math.floor(m.cargo[r] ?? 0);
    if (n > 0) cargo[r] = n;
  }
  const hasUnits = countUnits(m.units) > 0;
  const hasCargo = Object.keys(cargo).length > 0;
  const shipWord = m.ships === 1 ? t({ en: "ship", es: "barco" }) : t({ en: "ships", es: "barcos" });
  const place = (
    <Link href={`/isla/${m.targetIslandId}`} className="underline-offset-4 hover:underline">
      {m.targetLabel}
    </Link>
  );

  return (
    <li className="panel rise-in flex flex-col gap-1 px-3 pt-2.5 pb-1 sm:px-4" style={stagger(index, 60, 6, 120)}>
      <div className="flex items-center gap-2">
        <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-wide uppercase", kind.className)}>{t(kind.label)}</span>
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[15px] leading-tight font-bold">
          {outbound ? (
            <>
              <span>{m.originName}</span>
              <IconArrowRight size={14} className="shrink-0 text-bronze-dark" />
              <span className="sr-only">{t({ en: "to", es: "hacia" })}</span>
              {place}
            </>
          ) : (
            <>
              {place}
              <IconArrowRight size={14} className="shrink-0 text-bronze-dark" />
              <span className="sr-only">{t({ en: "back to", es: "de vuelta a" })}</span>
              <span>{m.originName}</span>
            </>
          )}
        </p>
        <span className="tabular shrink-0 text-right text-sm leading-tight">
          <span className="block text-[11px] font-bold text-ink-soft uppercase">
            {outbound ? t({ en: "Arrives", es: "Llega" }) : t({ en: "Returns", es: "Vuelve" })}
          </span>
          <strong className="text-base">
            <Countdown
              endsAt={missionEventAt(m)}
              serverNow={now}
              doneLabel={outbound ? t({ en: "Arriving", es: "Llegando" }) : t({ en: "Docking", es: "Amarrando" })}
            />
          </strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1" title={`${fmt(m.ships)} ${shipWord}`}>
          <ShipPortrait size={26} />
          <span className="tabular font-bold">{fmt(m.ships)}</span>
          <span className="sr-only">{shipWord}</span>
        </span>
        {hasUnits && <UnitStrip units={m.units} lang={lang} size={26} compact />}
        {hasCargo && <CostList cost={cargo} />}
        {!hasUnits && !hasCargo && m.kind === "colonize" && outbound && (
          <span className="text-ink-soft">{t({ en: "Settlers to found a colony", es: "Colonos para fundar" })}</span>
        )}
        {!hasUnits && !hasCargo && !outbound && <span className="text-ink-soft">{t({ en: "Coming back empty", es: "Vuelven vacíos" })}</span>}
      </div>

      {/* The ship layer slides by a share of its own width: clip it (with room for the ship) so it never widens the page. */}
      <div className="overflow-clip [overflow-clip-margin:24px]">
        <TimeProgress startedAt={outbound ? m.departsAt : m.arrivesAt} endsAt={missionEventAt(m)} serverNow={now} marker="ship" />
      </div>
    </li>
  );
}
