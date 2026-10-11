import { Suspense, ViewTransition, type ReactNode } from "react";
import type { Game } from "@/server/game-context";
import type { HeaderData } from "./chrome-cache";
import { CachedChrome, GameChrome } from "./chrome";
import { RememberCity } from "./nav";
import { SkeletonBody } from "./skeleton";

const SHELL = "mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 px-4 pt-1.5 pb-8 sm:px-6 sm:pt-3";

/*
  Section content enters and leaves through view transitions. The header is anchored
  (view-transition-name: game-header, captured apart from the shell), so only the content moves:
  - picking a tab slides the content toward the tab's side (nav-forward / nav-back),
  - the loading screen fades out quickly and the real content rises in (reveal-out / reveal-in).
*/
const CONTENT_ENTER = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "reveal-in" };
const CONTENT_EXIT = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-out" };
const SKELETON_ENTER = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Chrome shared by every game page: brand, city switcher, live resources, sections and advisor.
 * Server Component: receives the already-loaded game so pages read the database only once.
 */
export function GameShell({ game, children }: { game: Game; children: ReactNode }) {
  const { snapshot, city } = game;
  const p = snapshot.player;
  const goldPerHour = snapshot.cities.reduce((s, c) => s + c.rates.goldIncome - c.rates.goldUpkeep, 0) - p.awayUpkeep * snapshot.speed;
  const researchPerHour = snapshot.cities.reduce((s, c) => s + c.rates.research, 0);

  const header: HeaderData = {
    cityId: city.id,
    islandId: city.islandId,
    cities: snapshot.cities.map((c) => ({ id: c.id, name: c.name, islandName: c.island.name })),
    playerName: p.name,
    speed: snapshot.speed,
    unreadReports: snapshot.unreadReports,
    bar: {
      serverNow: snapshot.now,
      res: city.res,
      rates: {
        wood: city.rates.wood,
        luxury: city.rates.luxury,
        luxuryResource: city.rates.luxuryResource,
        wineUse: city.rates.wineUse,
      },
      storage: city.rates.storage,
      gold: p.gold,
      goldPerHour,
      research: p.research,
      researchPerHour,
      ambrosia: p.ambrosia,
      population: city.population,
      housing: city.rates.housing,
      freeCitizens: city.rates.freeCitizens,
    },
  };

  // The transition wraps the outermost DOM node: React only animates a <ViewTransition> whose
  // own content is what gets inserted or removed.
  return (
    <ViewTransition enter={CONTENT_ENTER} exit={CONTENT_EXIT} default="none">
      <div className={SHELL}>
        <RememberCity cityId={city.id} />
        <GameChrome header={header} advisor={snapshot.advisor} />
        <main className="flex flex-1 flex-col gap-3">{children}</main>
      </div>
    </ViewTransition>
  );
}

/**
 * Loading screen for any game section. Keeps the last header on screen (so the HUD never blinks)
 * and draws parchment placeholders shaped like the section that is coming, with a compass.
 */
export function GameSkeleton() {
  return (
    <ViewTransition enter={SKELETON_ENTER} exit="reveal-out" default="none">
      <div className={SHELL}>
        <CachedChrome />
        <main className="flex flex-1 flex-col gap-3" aria-busy="true">
          <Suspense fallback={<SkeletonBody />}>
            <SkeletonBody routeAware />
          </Suspense>
        </main>
      </div>
    </ViewTransition>
  );
}
