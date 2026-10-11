import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { CITY_GRID, SceneFit } from "@/components/game/scene-layout";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { CityScene } from "@/components/city/city-scene";
import { CityStatus } from "@/components/city/city-status";
import { cityHref, parseSlot } from "@/components/city/lib";
import { SlotPanel } from "@/components/city/slot-panel";
import { SlotPresence } from "@/components/city/slot-drawer";
import { getGame } from "@/server/game-context";

export const metadata: Metadata = { title: "Ciudad" };

export default function CityPage({ params, searchParams }: PageProps<"/ciudad/[id]">) {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <CityContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CityContent({ params, searchParams }: Pick<PageProps<"/ciudad/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const game = await getGame(id);
  // Unknown or foreign city id: getGame fell back to one of the player's cities.
  if (game.city.id !== id) redirect(cityHref(game.city.id));
  const slot = parseSlot(query.slot);

  return (
    <GameShell game={game}>
      <SceneFit>
        <div className={CITY_GRID}>
          <CityScene city={game.city} serverNow={game.snapshot.now} selected={slot} />
          {/* Desktop: the column is exactly as tall as the scene; an open panel fills it and scrolls inside. */}
          <aside aria-label="Detalle de la ciudad" className="flex min-w-0 flex-col gap-3 lg:relative lg:self-stretch">
            <div className={clsx("lg:sticky lg:top-3", slot != null && "lg:hidden")}>
              <CityStatus game={game} />
            </div>
            <SlotPresence open={slot != null}>{slot != null && <SlotPanel game={game} slot={slot} />}</SlotPresence>
          </aside>
        </div>
      </SceneFit>
    </GameShell>
  );
}
