import Link from "next/link";
import type { ReactNode } from "react";
import { ISLAND_PLOTS, RESOURCE_INFO } from "@/game/data";
import { travelSeconds, type PlayerState } from "@/game/engine";
import type { Game } from "@/server/game-context";
import type { IslandView as IslandData } from "@/server/queries";
import { ISLAND_GRID, SceneFit } from "@/components/game/scene-layout";
import { buttonClass } from "@/components/ui/button";
import { ResIcon } from "@/components/ui/res";
import { fmtDuration } from "@/lib/format";
import { IconArrowRight, IconFlag, IconSwords } from "./icons";
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

  return (
    <PanelProvider ids={Object.keys(panels)}>
      <div className="flex flex-col gap-3 lg:flex-1">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-foam drop-shadow sm:text-3xl">{island.name}</h1>
            <p className="inline-flex flex-wrap items-center gap-x-2 text-sm text-foam/85">
              <span className="inline-flex items-center gap-1">
                <ResIcon kind={island.resource} size={18} />
                Isla de {RESOURCE_INFO[island.resource].label.toLowerCase()}
              </span>
              <span aria-hidden>·</span>
              <span className="tabular">
                Coordenadas {island.x}:{island.y}
              </span>
              <span aria-hidden>·</span>
              <span className="tabular">
                {island.cities.length} de {ISLAND_PLOTS} lugares ocupados
              </span>
            </p>
          </div>
          <Link
            href="/mundo"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-foam/85 hover:bg-foam/10 hover:text-foam"
          >
            Ver el mapa del Egeo
            <IconArrowRight size={16} />
          </Link>
        </div>
        <SceneFit>
          <div className={ISLAND_GRID}>
            <IslandScene island={island} activeCityId={city.id} now={snapshot.now} fleets={fleets} />
            <PanelHost panels={panels} summary={<IslandSummary ctx={ctx} />} />
          </div>
        </SceneFit>
      </div>
    </PanelProvider>
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

function SummaryRow({ panel, icon, title, detail }: { panel: string; icon: ReactNode; title: string; detail: ReactNode }) {
  return (
    <li>
      <PanelLink
        panel={panel}
        className="group flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-parchment-2 focus-visible:ring-2 focus-visible:ring-bronze-dark"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-parchment-2 ring-1 ring-parchment-3">{icon}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-ink-soft">{detail}</span>
        </span>
        <IconArrowRight size={16} className="shrink-0 text-bronze-dark transition group-hover:translate-x-0.5" />
      </PanelLink>
    </li>
  );
}

function IslandSummary({ ctx }: { ctx: IslandCtx }) {
  const { island, city, myCities, travelSec } = ctx;
  const mineHere = myCities.filter((c) => c.islandId === island.id);
  const freeSlots = Array.from({ length: ISLAND_PLOTS }, (_, i) => i).filter((s) => !island.cities.some((c) => c.slot === s));
  const rebuilding = island.barbarians.rebuildingUntil;

  return (
    <section aria-label={`Resumen de ${island.name}`} className="panel flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">Qué hay en la isla</p>
        <p className="text-[15px] text-ink-soft">Tocá un lugar del mapa para ver qué podés hacer ahí.</p>
      </div>
      <ul className="-mx-2 flex flex-col">
        <SummaryRow panel="sawmill" icon={<ResIcon kind="wood" size={22} />} title="Aserradero" detail={`Nivel ${island.sawmill.level}`} />
        <SummaryRow
          panel="mine"
          icon={<ResIcon kind={island.resource} size={22} />}
          title={MINE_NAME[island.resource]}
          detail={`Nivel ${island.mine.level}`}
        />
        <SummaryRow
          panel="camp"
          icon={<IconSwords size={18} className="text-terracotta" />}
          title="Campamento bárbaro"
          detail={rebuilding ? `Nivel ${island.barbarians.level} · reconstruyendo` : `Nivel ${island.barbarians.level}`}
        />
        {freeSlots.length > 0 && (
          <SummaryRow
            panel={`plot-${freeSlots[0]}`}
            icon={<IconFlag size={16} className="text-bronze-dark" />}
            title={freeSlots.length === 1 ? "1 lugar libre" : `${freeSlots.length} lugares libres`}
            detail="Fundá una colonia"
          />
        )}
      </ul>

      <div className="flex flex-col gap-2 border-t border-parchment-3 pt-3">
        <p className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">Tus ciudades acá</p>
        {mineHere.length ? (
          <ul className="flex flex-col gap-1.5">
            {mineHere.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold">
                  {c.name}
                  {c.id === city.id && <span className="ml-1.5 text-sm font-normal text-ink-soft">(estás acá)</span>}
                </span>
                <Link href={`/ciudad/${c.id}`} className={buttonClass("secondary", "sm")}>
                  Ir a {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            Todavía no tenés ciudades en {island.name}. Desde {city.name} llegás en{" "}
            <strong className="tabular text-ink">{fmtDuration(travelSec * 1000)}</strong>.
          </p>
        )}
      </div>
    </section>
  );
}
