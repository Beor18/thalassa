"use client";

import { memo, type CSSProperties } from "react";
import Image from "next/image";
import { ISLAND_PLOTS, RESOURCE_INFO } from "@/game/data";
import { ISLAND_IMAGE } from "@/game/layout";
import { resourceLabel } from "@/game/names";
import type { WorldIsland } from "@/server/queries";
import { useI18n } from "@/i18n/client";
import type { I18n } from "@/i18n/i18n";
import type { Placed } from "./geometry";
import { s } from "./styles";

export type MapIsland = Placed<WorldIsland>;

export function islandSummary(i: WorldIsland, isCurrent: boolean, seconds: number, { t, lang, fmtDuration }: I18n) {
  const parts = [
    i.name,
    resourceLabel(i.resource, lang),
    t({ en: `${i.cityCount} of ${ISLAND_PLOTS} plots taken`, es: `${i.cityCount} de ${ISLAND_PLOTS} lugares ocupados` }),
  ];
  if (i.mine) parts.push(t({ en: "you have cities here", es: "tenés ciudades acá" }));
  parts.push(
    isCurrent
      ? t({ en: "you're here", es: "estás acá" })
      : t({ en: `${fmtDuration(seconds * 1000)} away`, es: `viaje de ${fmtDuration(seconds * 1000)}` }),
  );
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
  const i18n = useI18n();
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
        aria-label={islandSummary(i, isCurrent, seconds, i18n)}
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
            <span className={s.hereLabel}>{i18n.t({ en: "You're here", es: "Estás acá" })}</span>
            <span className={s.hereStem} />
          </span>
        </span>
      )}
      {isSelected && sparkle && <span className={s.sparkle} style={{ backgroundImage: `url(${sparkle})` }} />}
    </div>
  );
});
