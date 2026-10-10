import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CITY_SLOTS, RESOURCES, type Resource } from "@/game/data";
import { buildingLevel, countUnits, militaryPower, unitUpkeep, type CityState } from "@/game/engine";
import type { GameCity } from "@/server/game-context";
import type { MissionView } from "@/server/queries";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { stagger } from "@/components/motion/reveal";
import { IconArrowRight } from "@/components/island/icons";
import { ShipPortrait, UnitPortrait, UnitStrip, unitName } from "./units";

const freeLandSlot = (c: CityState) =>
  CITY_SLOTS.find((s) => s.kind === "land" && !c.buildings.some((b) => b.slot === s.slot))?.slot ?? 1;
const slotOf = (c: CityState, type: CityState["buildings"][number]["type"]) => c.buildings.find((b) => b.type === type)?.slot;

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">{children}</h4>;
}

// ---------------------------------------------------------------------------
// Per-city forces
// ---------------------------------------------------------------------------

export function CityForces({ city, speed, now, shipsAtSea }: { city: GameCity; speed: number; now: number; shipsAtSea: number }) {
  const barracksLevel = buildingLevel(city, "barracks");
  const barracksSlot = slotOf(city, "barracks");
  const portSlot = slotOf(city, "port");
  const power = militaryPower(city.units);
  const upkeep = unitUpkeep(city.units) * speed;
  const soldiers = countUnits(city.units);

  return (
    <article aria-labelledby={`forces-${city.id}`} className="panel flex flex-col gap-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`forces-${city.id}`} className="flex flex-wrap items-center gap-2 font-display text-lg leading-tight font-bold">
            {city.name}
            {city.isCapital && <span className="rounded-full bg-bronze px-2 py-0.5 font-body text-xs font-extrabold text-marble">Capital</span>}
          </h3>
          <p className="text-sm text-ink-soft">
            {city.island.name} · {barracksLevel ? `Cuartel nivel ${barracksLevel}` : "Sin Cuartel"}
          </p>
        </div>
        <Link href={`/ciudad/${city.id}`} className={buttonClass("secondary", "sm")}>
          Ir a {city.name}
        </Link>
      </header>

      <section className="flex flex-col gap-2">
        <SectionTitle>Tropas en casa</SectionTitle>
        <UnitStrip
          units={city.units}
          empty={
            barracksSlot === undefined ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
                <p className="text-sm">
                  <strong>No hay tropas.</strong> <span className="text-ink-soft">Primero necesitás un Cuartel.</span>
                </p>
                <Link href={`/ciudad/${city.id}?slot=${freeLandSlot(city)}`} className={buttonClass("primary", "sm")}>
                  Construí un Cuartel
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
                <p className="text-sm">
                  <strong>No hay tropas en casa.</strong> <span className="text-ink-soft">Los lanceros son baratos y firmes.</span>
                </p>
                <Link href={`/ciudad/${city.id}?slot=${barracksSlot}`} className={buttonClass("primary", "sm")}>
                  Entrenar tropas
                </Link>
              </div>
            )
          }
        />
        {soldiers > 0 && (
          <p className="tabular text-sm text-ink-soft">
            {fmt(soldiers)} {soldiers === 1 ? "soldado" : "soldados"} · poder {fmt(power)} · {soldiers === 1 ? "cuesta" : "cuestan"}{" "}
            {fmt(upkeep)} de oro por hora
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Barcos</SectionTitle>
        {city.rates.maxShips === 0 && city.ships === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
            <p className="text-sm">
              <strong>Sin puerto no hay barcos.</strong> <span className="text-ink-soft">Llevan tropas, colonos y recursos.</span>
            </p>
            <Link href={`/ciudad/${city.id}?slot=${portSlot ?? 12}`} className={buttonClass("primary", "sm")}>
              Hacé un Puerto
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <ShipPortrait size={48} />
            <p className="tabular leading-tight">
              <strong className="text-lg">{fmt(city.ships)}</strong> en el puerto
              {shipsAtSea > 0 && <span className="text-ink-soft"> · {fmt(shipsAtSea)} en el mar</span>}
              <span className="block text-sm text-ink-soft">Amarras para {fmt(city.rates.maxShips)}</span>
            </p>
          </div>
        )}
      </section>

      {city.training.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>En entrenamiento</SectionTitle>
          <ul className="flex flex-col gap-2">
            {city.training.map((b) => {
              const waiting = b.startedAt > now;
              return (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-parchment-2/60 p-2 ring-1 ring-parchment-3">
                  <UnitPortrait unit={b.unit} size={40} className="bg-transparent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">
                        {fmt(b.count)} {unitName(b.unit, b.count)}
                      </span>
                      <span className="tabular text-sm text-ink-soft">
                        {waiting ? "En espera · " : ""}
                        <Countdown endsAt={b.endsAt} serverNow={now} doneLabel="Listas" />
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
    </article>
  );
}

// ---------------------------------------------------------------------------
// Missions at sea
// ---------------------------------------------------------------------------

const KIND: Record<MissionView["kind"], { label: string; className: string }> = {
  transport: { label: "Transporte", className: "bg-sea-700 text-foam" },
  attack: { label: "Ataque", className: "bg-terracotta text-marble" },
  colonize: { label: "Colonia", className: "bg-olive text-marble" },
};

export const missionEventAt = (m: MissionView) => (m.status === "outbound" ? m.arrivesAt : (m.returnsAt ?? m.arrivesAt));

export function MissionCard({ mission: m, now, index = 0 }: { mission: MissionView; now: number; index?: number }) {
  const outbound = m.status === "outbound";
  const kind = KIND[m.kind];
  const cargo: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    const n = Math.floor(m.cargo[r] ?? 0);
    if (n > 0) cargo[r] = n;
  }
  const hasUnits = countUnits(m.units) > 0;
  const hasCargo = Object.keys(cargo).length > 0;

  return (
    <li className="panel rise-in flex flex-col gap-2.5 p-3 sm:p-4" style={stagger(index, 60, 6, 120)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-wide uppercase", kind.className)}>{kind.label}</span>
        <span className="text-sm font-bold text-ink-soft">{outbound ? "De ida" : "De vuelta"}</span>
        <span className="tabular ml-auto text-sm">
          {outbound ? "Llega en " : "Vuelve en "}
          <strong className="text-base">
            <Countdown endsAt={missionEventAt(m)} serverNow={now} doneLabel={outbound ? "Llegando" : "Amarrando"} />
          </strong>
        </span>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 font-bold">
        {outbound ? (
          <>
            <span>{m.originName}</span>
            <IconArrowRight size={16} className="text-bronze-dark" />
            <span className="sr-only">hacia</span>
            <Link href={`/isla/${m.targetIslandId}`} className="underline-offset-4 hover:underline">
              {m.targetLabel}
            </Link>
          </>
        ) : (
          <>
            <Link href={`/isla/${m.targetIslandId}`} className="underline-offset-4 hover:underline">
              {m.targetLabel}
            </Link>
            <IconArrowRight size={16} className="text-bronze-dark" />
            <span className="sr-only">de vuelta a</span>
            <span>{m.originName}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <ShipPortrait size={28} />
          <span className="tabular font-bold">
            {fmt(m.ships)} {m.ships === 1 ? "barco" : "barcos"}
          </span>
        </span>
        {hasUnits && <UnitStrip units={m.units} size={28} />}
        {hasCargo && <CostList cost={cargo} />}
        {!hasUnits && !hasCargo && m.kind === "colonize" && outbound && <span className="text-ink-soft">Colonos y materiales para fundar</span>}
        {!hasUnits && !hasCargo && !outbound && <span className="text-ink-soft">Vuelven vacíos</span>}
      </div>

      <TimeProgress startedAt={outbound ? m.departsAt : m.arrivesAt} endsAt={missionEventAt(m)} serverNow={now} marker="ship" />
    </li>
  );
}
