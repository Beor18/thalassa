import type { ReactNode } from "react";

/*
  Painted scene + side column (city, island). On desktop the space left under the header becomes a
  size container: the 3:2 scene grows until it fills that height or the width the column leaves,
  whichever comes first, and the pair stays centered. Phones and tablets stack them as before.
*/

/**
 * Fills the height left in the viewport and measures it (cqh) for the grid inside.
 * The container is absolutely positioned over the stretched wrapper: Chrome resolves cqh before
 * flexing, so a flex-grown container would measure 0.
 */
export function SceneFit({ children }: { children: ReactNode }) {
  return (
    <div className="lg:relative lg:min-h-[480px] lg:flex-1">
      <div className="lg:absolute lg:inset-0 lg:[container-type:size]">{children}</div>
    </div>
  );
}

/** City: scene (1px border) + detail column. */
export const CITY_GRID =
  "grid gap-3 lg:items-start lg:justify-center lg:grid-cols-[minmax(0,max(640px,calc(150cqh-2px)))_360px] xl:grid-cols-[minmax(0,max(640px,calc(150cqh-2px)))_420px]";

/** Island: framed scene (padding + border) + panel column. */
export const ISLAND_GRID =
  "grid items-start gap-3 lg:justify-center lg:grid-cols-[minmax(0,max(772px,calc(150cqh-8px)))_400px]";
