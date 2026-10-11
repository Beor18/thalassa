import type { ReactNode } from "react";

/**
 * SceneFit for the city, switched at xl instead of lg: from xl the space left under the header
 * becomes a size container (cqh/cqw) for the two-column CITY_GRID. Below xl the scene stacks over
 * the summary (see CITY_GRID) and plot panels open as a bottom sheet (CITY_SHEET_QUERY).
 * The container is absolutely positioned over the stretched wrapper: Chrome resolves cqh before
 * flexing, so a flex-grown container would measure 0.
 */
export function CityFit({ children }: { children: ReactNode }) {
  return (
    <div className="xl:relative xl:min-h-[480px] xl:flex-1">
      <div className="xl:absolute xl:inset-0 xl:[container-type:size]">{children}</div>
    </div>
  );
}
