import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGame } from "@/server/game-context";
import { getIsland } from "@/server/queries";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { buttonClass } from "@/components/ui/button";
import { IslandView } from "@/components/island/island-view";

export const metadata: Metadata = { title: "Isla" };

export default function Page({ params }: PageProps<"/isla/[id]">) {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <IslandContent params={params} />
    </Suspense>
  );
}

async function IslandContent({ params }: Pick<PageProps<"/isla/[id]">, "params">) {
  const { id } = await params;
  const game = await getGame();
  const islandId = Number(id);
  const island = Number.isInteger(islandId) && islandId > 0 ? await getIsland(islandId, game.snapshot.player.id) : null;

  return (
    <GameShell game={game}>
      {island ? (
        // The open panel (?panel=…) is read on the client, so switching panels never re-renders the page.
        <IslandView game={game} island={island} />
      ) : (
        <div className="panel mx-auto mt-6 flex max-w-md flex-col items-center gap-3 p-6 text-center">
          <h1 className="font-display text-2xl font-bold">Esa isla no existe</h1>
          <p className="text-ink-soft">Puede que el enlace esté mal. Elegí otra en el mapa o volvé a la tuya.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/mundo" className={buttonClass("primary", "md")}>
              Ver el mapa del Egeo
            </Link>
            <Link href={`/isla/${game.city.islandId}`} className={buttonClass("secondary", "md")}>
              Ir a {game.city.island.name}
            </Link>
          </div>
        </div>
      )}
    </GameShell>
  );
}
