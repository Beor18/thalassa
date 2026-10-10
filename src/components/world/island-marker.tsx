"use client";

import { memo, type CSSProperties } from "react";
import Image from "next/image";
import { ISLAND_PLOTS, RESOURCE_INFO } from "@/game/data";
import { ISLAND_IMAGE } from "@/game/layout";
import type { WorldIsland } from "@/server/queries";
import { fmtDuration } from "@/lib/format";
import type { Placed } from "./geometry";
import { s } from "./styles";

export type MapIsland = Placed<WorldIsland>;

export function islandSummary(i: WorldIsland, isCurrent: boolean, seconds: number) {
  const parts = [i.name, RESOURCE_INFO[i.resource].label, `${i.cityCount} de ${ISLAND_PLOTS} lugares ocupados`];
  if (i.mine) parts.push("tenés ciudades acá");
  parts.push(isCurrent ? "estás acá" : `viaje de ${fmtDuration(seconds * 1000)}`);
  return parts.join(", ");
}

export const IslandMarker = memo(function IslandMarker({
  island,
  isCurrent,
  isSelected,
  seconds,
  sparkle,
  onSelect,
}: {
  island: MapIsland;
  isCurrent: boolean;
  isSelected: boolean;
  seconds: number;
  sparkle: string | null;
  onSelect: (id: number, via: "pointer" | "keyboard") => void;
}) {
  const i = island;
  const style = {
    left: i.px,
    top: i.py,
    width: i.size,
    height: i.size,
    ["--bob-dur" as string]: `${i.bobDur}s`,
    ["--bob-delay" as string]: `${i.bobDelay}s`,
  } as CSSProperties;

  return (
    <div
      className={s.island}
      style={style}
      data-island={i.id}
      data-mine={i.mine ? "" : undefined}
      data-current={isCurrent ? "" : undefined}
      data-selected={isSelected ? "" : undefined}
    >
      <span className={s.shallows} />
      <span className={s.foam} />
      <span className={s.shadow} />
      {isCurrent && (
        <span className={s.beacon}>
          <span />
          <span />
          <span />
        </span>
      )}
      {isSelected && (
        <span className={s.reticle}>
          <span className={s.reticleRing} />
        </span>
      )}
      <button
        type="button"
        className={s.hit}
        aria-label={islandSummary(i, isCurrent, seconds)}
        aria-pressed={isSelected}
        aria-current={isCurrent ? "location" : undefined}
        onClick={(e) => onSelect(i.id, e.detail === 0 ? "keyboard" : "pointer")}
      >
        <span className={s.lift}>
          <span className={s.glow} />
          <span className={s.bob}>
            <Image
              src={ISLAND_IMAGE[i.resource]}
              alt=""
              width={i.size}
              height={i.size}
              unoptimized
              loading="eager"
              draggable={false}
              className={s.art}
              style={{ transform: `rotate(${i.rot}deg)${i.flip ? " scaleX(-1)" : ""}` }}
            />
            {i.mine && <span className={s.flag} />}
          </span>
        </span>
        <span className={s.banner} aria-hidden>
          <span className={s.ribbon}>
            <span className={s.resIcon} style={{ backgroundImage: `url(${RESOURCE_INFO[i.resource].icon})` }} />
            <span className={s.name}>{i.name}</span>
            <span className={s.count}>
              {i.cityCount}/{ISLAND_PLOTS}
            </span>
          </span>
        </span>
      </button>
      {isCurrent && (
        <span className={s.here} aria-hidden>
          <span className={s.hereChip}>
            <span className={s.hereLabel}>Estás acá</span>
            <span className={s.hereStem} />
          </span>
        </span>
      )}
      {isSelected && sparkle && <span className={s.sparkle} style={{ backgroundImage: `url(${sparkle})` }} />}
    </div>
  );
});
