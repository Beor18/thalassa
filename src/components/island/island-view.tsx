import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { BALANCE, ISLAND_PLOTS, RESOURCE_INFO } from "@/game/data";
import { hasTech, luxuryMultiplier, travelSeconds, type PlayerState } from "@/game/engine";
import type { Game } from "@/server/game-context";
import type { IslandView as IslandData } from "@/server/queries";
import { ISLAND_GRID, SceneFit } from "@/components/game/scene-layout";
import { Countdown } from "@/components/ui/countdown";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration } from "@/lib/format";
import { IconArrowRight, IconClock, IconFlag, IconLock, IconMap, IconPin, IconSwords, IconTemple } from "./icons";
import { ISLAND_FEATURES, ISLAND_PLOT_POS } from "@/game/layout";
import { troopMissions } from "@/components/city/troops-away";
import type { FleetPath } from "./fleets";
import { IslandScene } from "./island-scene";
import { MINE_NAME } from "./names";
import { PanelHost, PanelLink, PanelProvider, type PanelDef } from "./panel-host";
import { campPanel, minePanel, plotPanel, sawmillPanel, type IslandCtx } from "./panels";

export function IslandView({ game, island }: { game: Game; island: IslandData }) {
  const { snapshot, city } = game;
  const player: PlayerState = { ...snapshot.player, cities: snapshot.cities };
  const ctx: IslandCtx = {
    island,
    player,
    city,
    myCities: snapshot.cities,
    speed: snapshot.speed,
    now: snapshot.now,
    pendingColonies: snapshot.missions.filter((m) => m.kind === "colonize" && m.status === "outbound").length,
    travelSec: travelSeconds(player, city.island, island, snapshot.speed),
    shipsBackAt:
      snapshot.missions
        .filter((m) => m.originCityId === city.id)
        .map((m) => m.returnsAt ?? m.arrivesAt + (m.arrivesAt - m.departsAt))
        .sort((a, b) => a - b)[0] ?? null,
    troopsAway: troopMissions(snapshot.missions, city.id),
  };

  const fleets = fleetPaths(snapshot.missions, island);
  const panels: Record<string, PanelDef> = {
    sawmill: sawmillPanel(ctx),
    mine: minePanel(ctx),
    camp: campPanel(ctx),
  };
  for (let slot = 0; slot < ISLAND_PLOTS; slot++) panels[`plot-${slot}`] = plotPanel(ctx, slot);
  // Your city is here and nobody cuts wood: the sawmill is the thing to do.
  const idleSawmill = city.islandId === island.id && city.woodWorkers === 0;

  return (
    <PanelProvider ids={Object.keys(panels)}>
      <div className="flex flex-col gap-3 lg:flex-1">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="font-display text-2xl leading-none font-bold text-foam drop-shadow sm:text-3xl">{island.name}</h1>
          <ul aria-label="Datos de la isla" className="order-last flex w-full flex-wrap gap-1.5 sm:order-none sm:w-auto">
            <HeaderChip label={`Isla de ${RESOURCE_INFO[island.resource].label.toLowerCase()}`}>
              <ResIcon kind={island.resource} size={18} />
              {RESOURCE_INFO[island.resource].label}
            </HeaderChip>
            <HeaderChip label="Coordenadas en el mapa">
              <IconPin size={15} className="text-foam/70" />[{island.x}:{island.y}]
            </HeaderChip>
            <HeaderChip label="Lugares ocupados">
              <IconTemple size={15} className="text-foam/70" />
              {island.cities.length}/{ISLAND_PLOTS}
            </HeaderChip>
          </ul>
          <Link
            href="/mundo"
            className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-foam/85 hover:bg-foam/10 hover:text-foam"
          >
            <IconMap size={17} />
            Mapa del Egeo
          </Link>
        </header>
        <SceneFit>
          <div className={ISLAND_GRID}>
            <IslandScene island={island} activeCityId={city.id} now={snapshot.now} fleets={fleets} idleSawmill={idleSawmill} />
            <PanelHost panels={panels} summary={<IslandSummary ctx={ctx} idleSawmill={idleSawmill} />} />
          </div>
        </SceneFit>
      </div>
    </PanelProvider>
  );
}

function HeaderChip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li
      title={label}
      className="tabular inline-flex h-7 items-center gap-1.5 rounded-full bg-sea-950/55 px-2.5 text-sm font-bold text-foam ring-1 ring-foam/15 backdrop-blur-sm"
    >
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  );
}

/** Where the player's ships sail on this island's map: from their city (or the open sea) to the target. */
function fleetPaths(missions: Game["snapshot"]["missions"], island: IslandData): FleetPath[] {
  const SEA = { x: 50, y: 112 };
  const cityPos = (id: string) => {
    const c = island.cities.find((x) => x.id === id);
    return c ? ISLAND_PLOT_POS[c.slot] : null;
  };
  // Boats leave from the edge of a sprite, not from its middle, so they never sit on a ribbon.
  const nudge = (a: { x: number; y: number }, b: { x: number; y: number }, d: number) => {
    const dx = b.x - a.x;
    const dy = (b.y - a.y) / 1.5;
    const len = Math.hypot(dx, dy) || 1;
    return { x: a.x + (dx / len) * d, y: a.y + ((dy / len) * d) * 1.5 };
  };
  const trip = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ from: nudge(a, b, 6), to: nudge(b, a, 5) });
  return missions.flatMap((m): FleetPath[] => {
    const home = cityPos(m.originCityId);
    if (m.targetIslandId !== island.id) {
      // Coming back from another island to a city of this one.
      return m.status === "returning" && home && m.returnsAt
        ? [{ id: m.id, kind: m.kind, ...trip(SEA, home), departsAt: m.arrivesAt, arrivesAt: m.returnsAt, verb: "Vuelven en" }]
        : [];
    }
    const targetCity = island.cities.find((c) => c.name === m.targetLabel);
    const target =
      m.kind === "attack" && !targetCity ? ISLAND_FEATURES.barbarians : targetCity ? ISLAND_PLOT_POS[targetCity.slot] : { x: 50, y: 70 };
    const from = home ?? SEA;
    if (m.status === "outbound") {
      const verb = m.kind === "attack" ? "Ataque en" : m.kind === "colonize" ? "Colonos en" : "Carga en";
      return [{ id: m.id, kind: m.kind, ...trip(from, target), departsAt: m.departsAt, arrivesAt: m.arrivesAt, verb }];
    }
    return m.returnsAt ? [{ id: m.id, kind: m.kind, ...trip(target, from), departsAt: m.arrivesAt, arrivesAt: m.returnsAt, verb: "Vuelven en" }] : [];
  });
}

const rowClass = (alert?: boolean) =>
  clsx(
    "group flex min-h-12 items-center gap-2.5 rounded-xl px-2 py-1.5 transition focus-visible:ring-2 focus-visible:ring-bronze-dark",
    alert ? "bg-gold/20 ring-2 ring-gold hover:bg-gold/30" : "hover:bg-parchment-2",
  );

function RowBody({ icon, title, level, right }: { icon: ReactNode; title: ReactNode; level?: number; right?: ReactNode }) {
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-parchment-2 ring-1 ring-parchment-3">{icon}</span>
      <span className="min-w-0 flex-1 truncate leading-tight font-bold">
        {title}
        {level !== undefined && <span className="tabular ml-1.5 text-sm font-semibold text-ink-soft">Nv. {level}</span>}
      </span>
      {right && <span className="tabular inline-flex shrink-0 items-center gap-1 text-sm font-bold">{right}</span>}
      <IconArrowRight size={16} className="shrink-0 text-bronze-dark transition group-hover:translate-x-0.5" />
    </>
  );
}

function SummaryRow({ panel, alert, ...body }: { panel: string; alert?: boolean } & Parameters<typeof RowBody>[0]) {
  return (
    <li>
      <PanelLink panel={panel} className={rowClass(alert)}>
        <RowBody {...body} />
      </PanelLink>
    </li>
  );
}

function IslandSummary({ ctx, idleSawmill }: { ctx: IslandCtx; idleSawmill: boolean }) {
  const { island, city, myCities, travelSec, speed, player, now } = ctx;
  const here = city.islandId === island.id;
  const mineHere = myCities.filter((c) => c.islandId === island.id);
  const freeSlots = Array.from({ length: ISLAND_PLOTS }, (_, i) => i).filter((s) => !island.cities.some((c) => c.slot === s));
  const rebuilding = island.barbarians.rebuildingUntil;
  const wealth = hasTech(player, "wealth");
  const woodRate = city.woodWorkers * BALANCE.woodPerWorker * speed;
  const luxRate = city.luxWorkers * BALANCE.luxuryPerWorker * speed * luxuryMultiplier(city);
  const kicker = "px-2 text-xs font-extrabold tracking-wider text-bronze-dark uppercase";

  return (
    <section aria-label={`Resumen de ${island.name}`} className="panel flex flex-col gap-1.5 p-3">
      <div className="flex items-baseline justify-between gap-3 pr-8">
        <h2 className={kicker}>En la isla</h2>
        {/* The numbers in the rows are the active city's, not the island's. */}
        {here && <p className="min-w-0 truncate text-xs font-semibold text-ink-soft">Producción de {city.name}</p>}
      </div>
      <ul className="flex flex-col gap-0.5">
        <SummaryRow
          panel="sawmill"
          alert={idleSawmill}
          icon={<ResIcon kind="wood" size={22} />}
          title="Aserradero"
          level={island.sawmill.level}
          right={
            idleSawmill ? (
              <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-extrabold text-marble">Sin trabajadores</span>
            ) : here ? (
              <span className="text-success" title="Tu producción de madera">
                <span className="sr-only">Producción: </span>+{fmt(woodRate)}/h
              </span>
            ) : null
          }
        />
        <SummaryRow
          panel="mine"
          icon={<ResIcon kind={island.resource} size={22} />}
          title={MINE_NAME[island.resource]}
          level={island.mine.level}
          right={
            !wealth ? (
              <span title="Necesita Riqueza" className="text-ink-soft">
                <IconLock size={16} />
                <span className="sr-only">Bloqueado: necesita Riqueza</span>
              </span>
            ) : here ? (
              <span className={luxRate > 0 ? "text-success" : "text-ink-soft"} title={`Tu producción de ${RESOURCE_INFO[island.resource].label.toLowerCase()}`}>
                <span className="sr-only">Producción: </span>+{fmt(luxRate)}/h
              </span>
            ) : null
          }
        />
        <SummaryRow
          panel="camp"
          icon={<IconSwords size={18} className="text-terracotta" />}
          title="Bárbaros"
          level={island.barbarians.level}
          right={
            rebuilding ? (
              <span className="inline-flex items-center gap-1 text-ink-soft" title="Se rearman en">
                <IconClock size={15} />
                <span className="sr-only">Se rearman en </span>
                <Countdown endsAt={rebuilding} serverNow={now} />
              </span>
            ) : null
          }
        />
        {freeSlots.length > 0 && (
          <SummaryRow
            panel={`plot-${freeSlots[0]}`}
            icon={<IconFlag size={16} className="text-bronze-dark" />}
            title={freeSlots.length === 1 ? "1 lugar libre" : `${freeSlots.length} lugares libres`}
          />
        )}
      </ul>

      <div className="flex flex-col gap-1 border-t border-parchment-3 pt-2">
        <h2 className={kicker}>Tus ciudades</h2>
        {mineHere.length ? (
          <ul className="flex flex-col gap-0.5">
            {mineHere.map((c) => (
              <li key={c.id}>
                <Link href={`/ciudad/${c.id}`} className={rowClass()}>
                  <RowBody
                    icon={<IconTemple size={18} className={c.id === city.id ? "text-bronze-dark" : "text-ink-soft"} />}
                    title={c.name}
                    right={
                      c.id === city.id ? (
                        <span className="rounded-full bg-sea-900 px-2 py-0.5 text-xs font-extrabold text-gold">Estás acá</span>
                      ) : null
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 px-2 py-1 text-sm text-ink-soft">
            <IconClock size={16} className="shrink-0" />
            <span>
              <strong className="tabular text-ink">{fmtDuration(travelSec * 1000)}</strong> desde {city.name}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
