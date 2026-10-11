import { Suspense, ViewTransition, type ReactNode } from "react";
import type { Game } from "@/server/game-context";
import type { HeaderData } from "./chrome-cache";
import { CachedChrome, GameChrome } from "./chrome";
import { RememberCity } from "./nav";
import { SkeletonBody } from "./skeleton";

/** Phones and tablets keep room at the bottom for the section bar (56px + the home indicator). */
const SHELL =
  "mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 px-4 pt-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:pt-2 lg:pb-8";
const MAIN = "flex flex-1 flex-col gap-3 outline-none";

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
  const goldIncome = snapshot.cities.reduce((s, c) => s + c.rates.goldIncome, 0);
  const goldUpkeep = snapshot.cities.reduce((s, c) => s + c.rates.goldUpkeep, 0) + p.awayUpkeep * snapshot.speed;
  const goldPerHour = goldIncome - goldUpkeep;
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
      safe: city.rates.safe,
      goldIncome,
      goldUpkeep,
      growth: city.rates.growth,
    },
  };

  // The transition wraps the outermost DOM node: React only animates a <ViewTransition> whose
  // own content is what gets inserted or removed.
  return (
    <ViewTransition enter={CONTENT_ENTER} exit={CONTENT_EXIT} default="none">
      <div className={SHELL}>
        <RememberCity cityId={city.id} />
        <GameChrome header={header} advisor={snapshot.advisor} />
        <main tabIndex={-1} className={MAIN}>
          {children}
        </main>
      </div>
    </ViewTransition>
  );
}

/**
 * Loading screen for any game section. Keeps the last header on screen (so the HUD never blinks)
 * and draws parchment placeholders shaped like the section that is coming, with a compass.
 * `anchored={false}` drops the view-transition names, for the copy the game layout keeps
 * underneath (only one header may carry them at a time).
 */
export function GameSkeleton({ anchored = true }: { anchored?: boolean }) {
  return (
    <ViewTransition enter={SKELETON_ENTER} exit="reveal-out" default="none">
      <div className={SHELL}>
        <CachedChrome anchored={anchored} />
        <main tabIndex={-1} className={MAIN} aria-busy="true">
          <Suspense fallback={<SkeletonBody />}>
            <SkeletonBody routeAware />
          </Suspense>
        </main>
      </div>
    </ViewTransition>
  );
}
