import Image from "next/image";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { LuxuryResource } from "@/game/data";
import { ISLAND_FEATURES, ISLAND_FEATURE_IMAGE, ISLAND_PLOT_POS } from "@/game/layout";
import type { IslandView } from "@/server/queries";
import { Countdown } from "@/components/ui/countdown";
import { ResIcon } from "@/components/ui/res";
import { CloudShadows, Fire, Gulls, IslandBoats, Smoke, SunGlint, Twinkles, Vignette, SeaShimmer } from "@/components/fx/ambient";
import { fx } from "@/components/fx/classes";
import { ParallaxScene } from "@/components/fx/parallax";
import { SceneRibbon } from "@/components/fx/ribbon";
import { IconFlag, IconSwords, IconTemple } from "./icons";
import { MINE_NAME } from "./names";
import { LevelMedal, ResGlyph } from "./ui";
import { Fleets, type FleetPath } from "./fleets";
import { PanelLink } from "./panel-host";
import { ScrollFrame } from "./scroll-frame";
import { Sprite, Token } from "./sprite";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Side = "below" | "left" | "above";
type Tone = "parchment" | "gold" | "dark";

/** Ribbon placement per coastal plot: under the sprite unless a neighbour sits right there. */
const PLOT_LABEL_SIDE: Side[] = ["below", "below", "below", "below", "below", "left", "left", "above"];
const WATER = "/assets/fx/water";
const CITY_WIDTH = 11;

const at = (pos: { x: number; y: number }, width: number): CSSProperties => ({
  left: `${pos.x}%`,
  top: `${pos.y}%`,
  width: `${width}%`,
});

/** Name ribbon of a spot. Below the sprite by default, never on top of it. */
function Label({ side = "below", tone, title, sub }: { side?: Side; tone: Tone; title: ReactNode; sub?: ReactNode }) {
  return <SceneRibbon title={title} sub={sub} tone={tone} side={side} top={86} />;
}

/** Interactive spot over the painting: ground ring, sprite with a gold rim, life, ribbon. */
function Spot({
  panel,
  name,
  pos,
  width,
  focus,
  image,
  label,
  life,
  children,
}: {
  panel: string;
  /** what a screen reader announces for the spot */
  name: string;
  pos: { x: number; y: number };
  width: number;
  focus?: boolean;
  /** sprite file, also used for the gold rim */
  image: string;
  label: ReactNode;
  life?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PanelLink
      panel={panel}
      data-focus={focus ? "" : undefined}
      style={at(pos, width)}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl hover:z-20 focus-visible:z-20 focus-visible:outline-offset-4 aria-[current=true]:z-20"
    >
      <span
        aria-hidden
        className={clsx(
          fx.ground,
          fx.groundHover,
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        style={{ "--top": "74%", "--w": "86%" } as Vars}
      />
      <span aria-hidden className="opacity-0 transition-opacity duration-150 group-aria-[current=true]:opacity-100">
        <span className={clsx(fx.ground, fx.groundSelected, fx.glowPulse)} style={{ "--top": "74%", "--w": "86%" } as Vars} />
      </span>
      <span className="relative grid aspect-square w-full place-items-center transition-transform duration-200 ease-out motion-safe:group-hover:-translate-y-[6%] motion-safe:group-focus-visible:-translate-y-[6%] motion-safe:group-aria-[current=true]:-translate-y-[4%]">
        <Image src={image} alt="" aria-hidden width={384} height={384} unoptimized className={fx.rim} draggable={false} />
        <span className="relative grid w-full place-items-center">{children}</span>
        {life}
      </span>
      <span className="sr-only">{name}</span>
      {label}
    </PanelLink>
  );
}

/** What moves around each luxury mine, in % of its sprite. */
function MineLife({ resource }: { resource: LuxuryResource }) {
  switch (resource) {
    case "crystal":
      return (
        <Twinkles
          size={22}
          tint="hue-rotate(185deg) saturate(1.6) brightness(1.15)"
          points={[
            { x: 31, y: 24, delay: -0.4, dur: 4.6 },
            { x: 52, y: 14, delay: -2.1, dur: 5.2 },
            { x: 74, y: 30, delay: -3.4, dur: 4.9 },
            { x: 22, y: 58, delay: -1.3, dur: 5.6, s: 16 },
          ]}
        />
      );
    case "sulfur":
      return (
        <>
          <Smoke
            x={30}
            y={20}
            size={30}
            dur={6.2}
            peak={0.55}
            rise={-150}
            tint="sepia(1) saturate(3.2) hue-rotate(8deg) brightness(1.05)"
          />
          <Smoke
            x={64}
            y={18}
            size={24}
            dur={7}
            peak={0.45}
            rise={-140}
            offset={1.7}
            puffs={2}
            tint="sepia(1) saturate(3.2) hue-rotate(8deg) brightness(1.05)"
          />
        </>
      );
    case "marble":
      return <Smoke x={52} y={46} size={26} dur={5.4} peak={0.42} rise={-90} grow={1.8} puffs={2} tint="brightness(1.05)" />;
    case "wine":
      return (
        <Twinkles
          size={14}
          points={[
            { x: 38, y: 40, delay: -1, dur: 6.5 },
            { x: 64, y: 34, delay: -4, dur: 7.2 },
          ]}
        />
      );
  }
}

export function IslandScene({
  island,
  activeCityId,
  now,
  fleets,
  idleSawmill = false,
}: {
  island: IslandView;
  activeCityId: string;
  now: number;
  fleets: FleetPath[];
  /** the player's city is here and nobody works the sawmill: call them over */
  idleSawmill?: boolean;
}) {
  const rebuilding = island.barbarians.rebuildingUntil;
  const hasActive = island.cities.some((c) => c.id === activeCityId);
  const firstMine = island.cities.find((c) => c.isMine)?.id;

  return (
    <div className="panel-dark min-w-0 p-1.5">
      <ScrollFrame
        label={`Mapa de ${island.name}. Deslizá para ver toda la isla.`}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[10px] [scrollbar-color:rgb(111_179_230/0.5)_transparent] [scrollbar-width:thin]"
      >
        {/* Fixed minimum width keeps labels legible: narrow screens pan inside the frame, the page never scrolls sideways. */}
        <ParallaxScene className="relative aspect-[3/2] w-full min-w-[760px] overflow-clip">
          <div data-depth="1" data-oversize="1.016" className="absolute inset-0">
            <Image
              src="/assets/scene-island.webp"
              alt=""
              fill
              preload
              draggable={false}
              sizes="(min-width: 1024px) 72vw, 760px"
              className="pointer-events-none object-cover select-none"
            />

            <SeaShimmer a={`${WATER}/island-water-a.webp`} b={`${WATER}/island-water-b.webp`} opacity={0.8} dur={8.5} />
            <IslandBoats />

            <Spot
              panel="sawmill"
              name={`Aserradero, nivel ${island.sawmill.level}${idleSawmill ? ", sin trabajadores" : ""}`}
              pos={ISLAND_FEATURES.sawmill}
              width={12}
              focus={idleSawmill}
              image={ISLAND_FEATURE_IMAGE.sawmill}
              label={<Label tone="parchment" title="Aserradero" />}
              life={<Smoke x={58} y={40} size={20} dur={4.6} peak={0.42} rise={-120} tint="sepia(0.6) saturate(1.2)" puffs={2} />}
            >
              <Sprite
                src={ISLAND_FEATURE_IMAGE.sawmill}
                eager
                fallback={
                  <Token>
                    <ResIcon kind="wood" size={30} />
                  </Token>
                }
              />
              <LevelMedal level={island.sawmill.level} className="top-[6%] right-[8%]" />
              {idleSawmill && (
                <span aria-hidden className={clsx("absolute -top-[44%] left-1/2 -ml-5", fx.float)}>
                  <span className="relative grid size-10 place-items-center rounded-full bg-gradient-to-b from-[#f7d77a] to-gold shadow-lg ring-2 ring-marble">
                    <ResGlyph kind="citizens" size={24} />
                    <span className="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-terracotta text-[11px] leading-none font-black text-marble ring-2 ring-marble">
                      !
                    </span>
                  </span>
                </span>
              )}
            </Spot>

            <Spot
              panel="mine"
              name={`${MINE_NAME[island.resource]}, nivel ${island.mine.level}`}
              pos={ISLAND_FEATURES.mine}
              width={12}
              image={ISLAND_FEATURE_IMAGE[island.resource]}
              label={<Label tone="parchment" title={MINE_NAME[island.resource]} />}
              life={<MineLife resource={island.resource} />}
            >
              <Sprite
                src={ISLAND_FEATURE_IMAGE[island.resource]}
                eager
                fallback={
                  <Token>
                    <ResIcon kind={island.resource} size={30} />
                  </Token>
                }
              />
              <LevelMedal level={island.mine.level} className="top-[6%] right-[8%]" />
            </Spot>

            <Spot
              panel="camp"
              name={`Campamento bárbaro, nivel ${island.barbarians.level}${rebuilding ? ", reconstruyendo" : ""}`}
              pos={ISLAND_FEATURES.barbarians}
              width={11}
              image={ISLAND_FEATURE_IMAGE.barbarians}
              label={
                <Label
                  tone={rebuilding ? "dark" : "parchment"}
                  title="Bárbaros"
                  sub={rebuilding ? <Countdown endsAt={rebuilding} serverNow={now} /> : undefined}
                />
              }
              life={
                rebuilding ? (
                  <Smoke x={60} y={58} size={22} dur={6.5} peak={0.4} rise={-150} puffs={2} />
                ) : (
                  <>
                    <Fire x={60} y={63} size={16} />
                    <Smoke x={60} y={52} size={18} dur={5.6} peak={0.32} rise={-160} puffs={2} offset={0.8} />
                  </>
                )
              }
            >
              <span className={clsx("grid w-full place-items-center", rebuilding && "opacity-70 grayscale")}>
                <Sprite
                  src={ISLAND_FEATURE_IMAGE.barbarians}
                  eager
                  fallback={
                    <Token tone="danger">
                      <IconSwords size={26} />
                    </Token>
                  }
                />
              </span>
              <LevelMedal level={island.barbarians.level} tone="red" className="top-[6%] right-[8%]" />
            </Spot>

            {ISLAND_PLOT_POS.map((pos, slot) => {
              const c = island.cities.find((x) => x.slot === slot);
              if (!c) {
                return (
                  <PanelLink
                    key={slot}
                    panel={`plot-${slot}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className="group absolute z-10 grid aspect-[2/1] min-h-11 w-[6.5%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full hover:z-20 focus-visible:z-20 aria-[current=true]:z-20"
                  >
                    <span
                      aria-hidden
                      className={clsx(fx.ground, fx.groundEmpty, "group-aria-[current=true]:opacity-0")}
                      style={{ "--top": "50%", "--w": "100%" } as Vars}
                    />
                    <span aria-hidden className="opacity-0 group-aria-[current=true]:opacity-100">
                      <span
                        className={clsx(fx.ground, fx.groundSelected, fx.glowPulse)}
                        style={{ "--top": "50%", "--w": "100%" } as Vars}
                      />
                    </span>
                    <span
                      aria-hidden
                      className={clsx(fx.ground, fx.groundRipple)}
                      style={{ "--top": "50%", "--w": "100%", "--delay": `${(-slot * 0.8).toFixed(1)}s`, "--dur": "3.6s" } as Vars}
                    />
                    <span
                      aria-hidden
                      className={clsx("relative -translate-y-[30%]", fx.float)}
                      style={{ "--delay": `${(-slot * 0.5).toFixed(1)}s` } as Vars}
                    >
                      <span
                        className={clsx(
                          fx.medallion,
                          "transition-transform duration-150 ease-out group-hover:scale-110 group-focus-visible:scale-110 group-aria-[current=true]:scale-110",
                        )}
                        style={{ "--m": "26px" } as Vars}
                      >
                        <IconFlag size={13} />
                      </span>
                    </span>
                    <span className="sr-only">Lugar libre {slot + 1}</span>
                    <SceneRibbon title="Lugar libre" sub="Fundá una colonia" top={80} reveal />
                  </PanelLink>
                );
              }
              const isActive = c.id === activeCityId;
              const focus = hasActive ? isActive : c.id === firstMine;
              return (
                <Spot
                  key={slot}
                  panel={`plot-${slot}`}
                  name={`${c.name}, ${c.isMine ? (isActive ? "tu ciudad, estás acá" : "tu ciudad") : `ciudad de ${c.playerName}`}`}
                  pos={pos}
                  width={CITY_WIDTH}
                  focus={focus}
                  image={ISLAND_FEATURE_IMAGE.city}
                  label={
                    <Label
                      side={PLOT_LABEL_SIDE[slot]}
                      tone={c.isMine ? "gold" : "dark"}
                      title={c.name}
                      sub={c.isMine ? (isActive ? "Estás acá" : undefined) : c.playerName}
                    />
                  }
                >
                  <Sprite
                    src={ISLAND_FEATURE_IMAGE.city}
                    eager={focus}
                    fallback={
                      <Token tone={c.isMine ? "gold" : "parchment"} className="w-[70%]">
                        <IconTemple size={24} />
                      </Token>
                    }
                  />
                  {isActive && (
                    <span aria-hidden className={clsx("absolute -top-1 right-[4%]", fx.float)}>
                      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-b from-[#f7d77a] to-gold text-ink shadow-md ring-2 ring-marble">
                        <IconFlag size={14} />
                      </span>
                    </span>
                  )}
                </Spot>
              );
            })}

            <Fleets paths={fleets} serverNow={now} />

            <div className="pointer-events-none absolute inset-0 z-30">
              <CloudShadows
                clouds={[
                  { img: 1, w: 46, opacity: 0.15, dur: 170, delay: -40, from: [-30, 30], to: [130, 52] },
                  { img: 3, w: 54, opacity: 0.12, dur: 220, delay: -150, from: [-35, 72], to: [135, 90] },
                  { img: 2, w: 40, opacity: 0.13, dur: 200, delay: -95, from: [-30, 4], to: [130, 18] },
                ]}
              />
              <CloudShadows wisps clouds={[{ img: 2, w: 34, opacity: 0.3, dur: 150, delay: -60, from: [-25, 96], to: [125, 84] }]} />
            </div>
          </div>

          {/* Closer to the eye than the island: moves more when the camera leans. */}
          <div data-depth="2.4" className="pointer-events-none absolute inset-0 z-40">
            <Gulls
              gulls={[
                { from: [-6, 60], to: [106, 30], dur: 38, delay: -12, size: 1.9, shadow: [160, 300] },
                { from: [104, 104], to: [40, -6], dur: 52, delay: -36, size: 1.7, shadow: [160, 300] },
              ]}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-40">
            <SunGlint dur={23} delay={9} />
            <Vignette />
          </div>
        </ParallaxScene>
      </ScrollFrame>
      <p className="px-2 pt-1.5 pb-0.5 text-xs text-foam/75 md:hidden">Deslizá para ver toda la isla</p>
    </div>
  );
}
