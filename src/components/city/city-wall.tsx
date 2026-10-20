import Image from "next/image";
import clsx from "clsx";
import type { CSSProperties } from "react";
import { Fire, Twinkles } from "@/components/fx/ambient";
import { WALL_VIEW, type Pt } from "./city-wall-plan";
import { LIGHT_FLAME, TowerArt, WallArt, riseDelay, towerRise, wallLayout, wallSilhouette, type TowerPlace, type WallLayout } from "./city-wall-art";
import { WallRise } from "./city-wall-rise";

/*
  The ring of walls around the city, growing with the Wall level (tiers in city-wall-plan.ts).
  Layers, back to front:
  - the static SVG of the wall bands, under every plot (z 9);
  - parapet fires and the marble sheen, HTML on top of it so only they animate;
  - one element per tower (painted sprite or SVG), stacked like the plots by its depth, so a tower
    standing in front of a building covers it and hovering a plot still lifts the plot above it.
  Everything is decorative: no pointer events, hidden from assistive tech.
*/

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const pctX = (x: number) => (x / WALL_VIEW.w) * 100;
const pctY = (y: number) => (y / WALL_VIEW.h) * 100;

/** The wall bands fade up from the ground during the "stones rise" moment. */
const bandRise = "motion-safe:group-data-[rise]/wall:animate-[wall-rise_1.1s_var(--ease-out-quint)_both]";

export function CityWall({ cityId, level }: { cityId: string; level: number }) {
  const layout = wallLayout(level);
  return (
    // No z-index on the wrapper: the towers inside have to stack with the plots of the scene.
    <WallRise cityId={cityId} level={level} className="group/wall pointer-events-none absolute inset-0">
      {layout && <Ring layout={layout} />}
    </WallRise>
  );
}

function Ring({ layout }: { layout: WallLayout }) {
  const { tier, lights } = layout;
  const brazier = tier.lights?.kind === "brazier";
  return (
    <>
      <WallArt layout={layout} className={clsx("absolute inset-0 z-[9] size-full", bandRise)} />
      {lights.length > 0 && (
        <div className={clsx("absolute inset-0 z-[9]", bandRise)}>
          {lights.map(([x, y], i) => (
            <Fire key={i} x={pctX(x)} y={pctY(y - 5.5 - LIGHT_FLAME * 0.4)} size={brazier ? 1.5 : 1.1} embers={brazier ? 2 : 1} />
          ))}
        </div>
      )}
      {tier.sheen && <Sheen layout={layout} />}
      {layout.towers.map((t) => (
        <Tower key={t.id} t={t} layout={layout} />
      ))}
    </>
  );
}

/** A slow band of light crossing the stone, masked to the wall bands. */
function Sheen({ layout }: { layout: WallLayout }) {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(wallSilhouette(layout))}")`;
  return (
    <div
      className={clsx("absolute inset-0 z-[9] overflow-hidden motion-reduce:hidden", bandRise)}
      style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    >
      <div className="absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(100deg,transparent_25%,rgb(255_241_205/0.62)_50%,transparent_75%)] motion-safe:animate-[wall-sheen_13s_ease-in-out_infinite]" />
    </div>
  );
}

function Tower({ t, layout }: { t: TowerPlace; layout: WallLayout }) {
  const { box } = t;
  // Points inside the tower's own box, in %.
  const inBox = (p: Pt): [number, number] => [((p[0] - box.x) / box.w) * 100, ((p[1] - box.y) / box.h) * 100];
  const fire = t.fire && inBox(t.fire);
  const crown = t.crown && inBox(t.crown);
  return (
    <span
      className={clsx("absolute z-(--z) block", towerRise)}
      style={
        {
          left: `${pctX(box.x)}%`,
          top: `${pctY(box.y)}%`,
          width: `${pctX(box.w)}%`,
          aspectRatio: `${box.w} / ${box.h}`,
          "--z": t.z,
          "--rise-delay": riseDelay(t.rank),
        } as Vars
      }
    >
      {t.sprite ? (
        <Image
          src={t.sprite.src}
          alt=""
          width={384}
          height={384}
          sizes="(min-width: 1024px) 8vw, (min-width: 768px) 11vw, 80px"
          className="sprite block size-full select-none"
          draggable={false}
        />
      ) : (
        <TowerArt t={t} layout={layout} className="block size-full" />
      )}
      {fire && <Fire x={fire[0]} y={fire[1]} size={(t.fireSize / box.w) * 100} embers={2} />}
      {crown && <Flag left={crown[0]} top={crown[1]} width={(26 / box.w) * 100} delay={-t.rank * 0.45} />}
      {crown && layout.tier.sheen && <Twinkles points={[{ x: crown[0], y: crown[1] + 7, delay: -t.rank * 0.9, dur: 6.5 }]} size={24} />}
      {/* Dust kicked up while the tower springs from the ground */}
      <span className="absolute bottom-[1%] left-1/2 aspect-[2/1] w-[115%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(222_200_160/0.8),transparent)] opacity-0 motion-safe:group-data-[rise]/wall:animate-[wall-dust_1.3s_ease-out_var(--rise-delay)_both]" />
    </span>
  );
}

/** A navy pennant on a pole whose foot is at left/top (% of the tower box); only the cloth moves. */
function Flag({ left, top, width, delay }: { left: number; top: number; width: number; delay: number }) {
  return (
    <span className="absolute block -translate-x-[5%] -translate-y-full" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%` }}>
      <svg viewBox="0 0 30 36" className="block w-full overflow-visible">
        <path d="M1.5 36V3" stroke="#6b4a1c" strokeWidth={1.6} />
        <circle cx={1.5} cy={2.2} r={2} fill="#e3b341" />
      </svg>
      <span
        className="absolute top-[9%] left-[5%] block w-[88%] origin-left motion-safe:animate-[wall-wave_2.8s_ease-in-out_infinite]"
        style={{ animationDelay: `${delay.toFixed(2)}s` }}
      >
        <svg viewBox="0 0 28 11" className="block w-full">
          <path d="M0 0H28L22 5.5L28 11H0Z" fill="#1d3f8f" />
          <path d="M0 0H28L22 5.5L28 11H0Z" fill="none" stroke="#e3b341" strokeWidth={0.8} />
          <path d="M3 5.5H17" stroke="#e3b341" strokeWidth={1.2} />
        </svg>
      </span>
    </span>
  );
}
