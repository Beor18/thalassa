import { Suspense } from "react";
import type { Metadata } from "next";
import { travelSeconds, type PlayerState } from "@/game/engine";
import type { Resource } from "@/game/data";
import { getGame } from "@/server/game-context";
import { getWorld } from "@/server/queries";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { WorldMap } from "@/components/world/world-map";
import type { FleetView } from "@/components/world/types";
import { worldFx } from "./fx";

export const metadata: Metadata = { title: "Mundo" };

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <WorldContent />
    </Suspense>
  );
}

async function WorldContent() {
  const game = await getGame();
  const { snapshot, city } = game;
  const islands = await getWorld(snapshot.player.id);
  const player: PlayerState = { ...snapshot.player, cities: snapshot.cities };
  const travel = Object.fromEntries(islands.map((i) => [i.id, travelSeconds(player, city.island, i, snapshot.speed)]));

  const islandOfCity = new Map(snapshot.cities.map((c) => [c.id, c.islandId]));
  const fleets: FleetView[] = snapshot.missions.flatMap((m) => {
    const homeIslandId = islandOfCity.get(m.originCityId);
    if (homeIslandId === undefined) return [];
    const cargo = Object.fromEntries(Object.entries(m.cargo).filter(([, v]) => v > 0)) as Partial<Record<Resource, number>>;
    return [
      {
        id: m.id,
        kind: m.kind,
        status: m.status,
        homeIslandId,
        targetIslandId: m.targetIslandId,
        originName: m.originName,
        targetLabel: m.targetLabel,
        ships: m.ships,
        departsAt: m.departsAt,
        arrivesAt: m.arrivesAt,
        returnsAt: m.returnsAt,
        cargo,
      },
    ];
  });

  return (
    <GameShell game={game}>
      <WorldMap
        islands={islands}
        currentIslandId={city.islandId}
        originName={city.name}
        travel={travel}
        fleets={fleets}
        myCities={snapshot.cities.map((c) => ({ id: c.id, name: c.name, islandId: c.islandId }))}
        serverNow={snapshot.now}
        fx={worldFx()}
      />
    </GameShell>
  );
}
