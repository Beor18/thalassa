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

/**
 * City: scene (1px border) + detail column, side by side from xl inside CityFit (components/city).
 * The column takes what the height-filling scene leaves (between 340 and 440px), so the scene is
 * height-bound on common laptops instead of stopping short. From lg to xl a column would leave the
 * scene too narrow: it stacks over the summary, capped to the height under the header.
 */
export const CITY_GRID =
  "grid gap-3 lg:max-xl:justify-center lg:max-xl:grid-cols-[minmax(0,calc((100dvh_-_8.5rem)_*_1.5))] xl:items-start xl:justify-center xl:grid-cols-[minmax(0,max(640px,calc(150cqh_-_2px)))_clamp(340px,calc(100cqw_-_150cqh_-_10px),440px)]";

/** Island: framed scene (padding + border) + panel column (narrower on small laptops so the scene keeps more room). */
export const ISLAND_GRID =
  "grid items-start gap-3 lg:justify-center lg:grid-cols-[minmax(0,max(772px,calc(150cqh-8px)))_360px] xl:grid-cols-[minmax(0,max(772px,calc(150cqh-8px)))_400px]";
