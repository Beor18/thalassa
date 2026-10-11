import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGame } from "@/server/game-context";
import { getIsland } from "@/server/queries";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { buttonClass } from "@/components/ui/button";
import { IslandView } from "@/components/island/island-view";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Island", es: "Isla" }) };
}

export default function Page({ params }: PageProps<"/[lang]/isla/[id]">) {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <IslandContent params={params} />
    </Suspense>
  );
}

async function IslandContent({ params }: Pick<PageProps<"/[lang]/isla/[id]">, "params">) {
  const { id } = await params;
  const { t } = await getI18n();
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
          <h1 className="font-display text-2xl font-bold">{t({ en: "That island doesn't exist", es: "Esa isla no existe" })}</h1>
          <p className="text-ink-soft">
            {t({
              en: "The link may be wrong. Pick another one on the map or head back to yours.",
              es: "Puede que el enlace esté mal. Elegí otra en el mapa o volvé a la tuya.",
            })}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/mundo" className={buttonClass("primary", "md")}>
              {t({ en: "Open the Aegean map", es: "Ver el mapa del Egeo" })}
            </Link>
            <Link href={`/isla/${game.city.islandId}`} className={buttonClass("secondary", "md")}>
              {t({ en: `Go to ${game.city.island.name}`, es: `Ir a ${game.city.island.name}` })}
            </Link>
          </div>
        </div>
      )}
    </GameShell>
  );
}
