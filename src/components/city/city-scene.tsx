import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { BUILDINGS, CITY_SLOTS, type BuildingType, type SlotKind } from "@/game/data";
import { buildingName } from "@/game/names";
import { CITY_PLOTS, CITY_SPRITE_WIDTH, CONSTRUCTION_IMAGE, SHIP_IMAGE } from "@/game/layout";
import { Countdown } from "@/components/ui/countdown";
import { CloudShadows, Gulls, HammerSparks, Ripples, Smoke, SunGlint, Twinkles, Vignette, SeaShimmer } from "@/components/fx/ambient";
import { ParallaxScene } from "@/components/fx/parallax";
import { SceneRibbon } from "@/components/fx/ribbon";
import { fx as scene } from "@/components/fx/classes";
import type { I18n } from "@/i18n/i18n";
import { getI18n } from "@/i18n/server";
import type { GameCity } from "@/server/game-context";
import { IconColumns, IconUp } from "./icons";
import { NameCityPrompt } from "./name-city-prompt";
import { emptySlotLabel, plotId, slotHref } from "./lib";
import { SceneFrame } from "./scene-frame";
import { PlotMotion, SceneEvents, type CitySnapshot } from "./scene-events";

/** Where docked ships bob on the water, in % of the scene. */
const MOORINGS = [
  { x: 7, y: 79 },
  { x: 18, y: 83 },
  { x: 29.5, y: 88 },
];

const WATER = "/assets/fx/water";
const SCAFFOLD = "/assets/fx/scaffold.webp";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export async function CityScene({
  city,
  serverNow,
  selected,
  ready = [],
  nameIt = false,
}: {
  city: GameCity;
  serverNow: number;
  selected: number | null;
  /** plots whose next level the city can pay right now (a small arrow on their badge) */
  ready?: number[];
  /** the city still has its automatic name: invite the player to name it */
  nameIt?: boolean;
}) {
  const i18n = await getI18n();
  const { t } = i18n;
  const docked = Math.min(city.ships, MOORINGS.length);
  const focusX = selected != null ? CITY_PLOTS[selected].x : CITY_PLOTS[0].x;
  const snapshot: CitySnapshot = {
    b: city.buildings.map((b) => [b.slot, b.type, b.level]),
    c: city.construction ? [city.construction.slot, city.construction.type, city.construction.targetLevel] : null,
  };

  return (
    <section
      aria-labelledby="city-title"
      className="relative overflow-hidden rounded-2xl border border-sea-300/30 bg-sea-900 shadow-[0_18px_40px_-18px_rgb(6_26_48/0.9)]"
    >
      {/* The header's city switcher already shows the name: the plaque only says where the city stands.
          Phones: a slim bar above the painting, so it never hides a plot. Wider: a small plaque over the scene. */}
      <div className="relative z-[60] border-b border-sea-300/20 bg-sea-950/70 px-3 py-1.5 md:pointer-events-none md:absolute md:inset-x-0 md:top-0 md:border-0 md:bg-transparent md:p-3">
        <div className="min-w-0 md:pointer-events-auto md:inline-block md:max-w-[75%] md:rounded-[12px] md:border md:border-sea-300/25 md:bg-gradient-to-b md:from-sea-800/90 md:to-sea-950/95 md:px-2.5 md:py-1 md:shadow-lg md:backdrop-blur-sm">
          <h1 id="city-title" className="sr-only">
            {city.name}
          </h1>
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-foam/85">
            {city.isCapital && <IconColumns size={15} className="shrink-0 text-gold" />}
            <span className="truncate">
              {city.isCapital
                ? t({ en: `Capital on ${city.island.name}`, es: `Capital en ${city.island.name}` })
                : t({ en: `Colony on ${city.island.name}`, es: `Colonia en ${city.island.name}` })}
            </span>
          </p>
          {nameIt && <NameCityPrompt cityId={city.id} name={city.name} />}
        </div>
      </div>

      <SceneFrame focusX={focusX} hint={t({ en: "Swipe to see the whole city", es: "Deslizá para ver toda la ciudad" })}>
        <ParallaxScene className="relative aspect-[3/2] w-full min-w-[720px] overflow-clip md:min-w-0">
          <nav aria-label={t({ en: "City plots", es: "Lugares de la ciudad" })} data-depth="1" data-oversize="1.016" className="absolute inset-0">
            <Image
              src="/assets/scene-city.webp"
              alt=""
              fill
              preload
              sizes="(min-width: 1024px) 72vw, (min-width: 768px) 100vw, 720px"
              className="pointer-events-none object-cover select-none"
              draggable={false}
            />

            {/* Sea: light dancing in the shallows, slow swell further out, foam on the rocks */}
            <SeaShimmer a={`${WATER}/city-water-a.webp`} b={`${WATER}/city-water-b.webp`} opacity={0.85} dur={7.5} />

            {MOORINGS.slice(0, docked).map((m, i) => (
              <span
                key={i}
                aria-hidden
                className="pointer-events-none absolute w-[7.5%] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <span className="absolute top-[78%] left-1/2 w-[120%] -translate-x-1/2">
                  <Ripples count={2} dur={3.6} delay={i * -1.1} peak={0.55} />
                </span>
                <Image
                  src={SHIP_IMAGE}
                  alt=""
                  width={384}
                  height={384}
                  sizes="96px"
                  className="sprite relative h-auto w-full select-none motion-safe:animate-float"
                  style={{ animationDelay: `${i * -1.1}s` }}
                  draggable={false}
                />
              </span>
            ))}

            <SceneEvents cityId={city.id} snapshot={snapshot}>
              {CITY_SLOTS.map(({ slot, kind }) => (
                <Plot
                  key={slot}
                  city={city}
                  slot={slot}
                  kind={kind}
                  selected={selected === slot}
                  canUpgrade={ready.includes(slot)}
                  serverNow={serverNow}
                  i18n={i18n}
                />
              ))}
            </SceneEvents>

            <div className="pointer-events-none absolute inset-0 z-[56]">
              <CloudShadows
                clouds={[
                  { img: 1, w: 50, opacity: 0.16, dur: 150, delay: -25, from: [-30, 20], to: [130, 42] },
                  { img: 2, w: 42, opacity: 0.13, dur: 190, delay: -120, from: [-30, 68], to: [130, 84] },
                  { img: 3, w: 56, opacity: 0.12, dur: 230, delay: -70, from: [-35, -8], to: [135, 12] },
                ]}
              />
            </div>
          </nav>

          {/* Closer to the eye: birds move more than the ground when the camera leans. */}
          <div data-depth="2.6" className="pointer-events-none absolute inset-0 z-[57]">
            <Gulls
              gulls={[
                { from: [-6, 72], to: [106, 38], dur: 34, delay: -5, size: 2.6 },
                { from: [106, 92], to: [-6, 60], dur: 43, delay: -26, size: 2.2, shadow: [-120, 230] },
                { from: [28, 108], to: [74, -8], dur: 49, delay: -40, size: 2.4 },
              ]}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[58]">
            <SunGlint dur={21} delay={6} />
            <Vignette />
          </div>
        </ParallaxScene>
      </SceneFrame>
    </section>
  );
}

/** Small signs of life on a finished building, placed in % of its sprite. */
function BuildingLife({ type }: { type: BuildingType }): ReactNode {
  switch (type) {
    case "tavern":
      return <Smoke x={34} y={20} size={20} dur={6} peak={0.5} rise={-170} />;
    case "academy":
      return <Smoke x={30} y={22} size={15} dur={6.8} peak={0.38} rise={-180} puffs={2} offset={1.2} />;
    case "carpenter":
      return <Smoke x={56} y={52} size={16} dur={4.2} peak={0.42} rise={-110} tint="sepia(0.7) saturate(1.4)" puffs={2} />;
    case "town_hall":
      return <Twinkles points={[{ x: 50, y: 22, delay: -1.5, dur: 7 }]} size={18} />;
    case "palace":
      return <Twinkles points={[{ x: 52, y: 20, delay: -4, dur: 8 }]} size={18} />;
    case "museum":
      return <Twinkles points={[{ x: 46, y: 30, delay: -2.6, dur: 9 }]} size={16} />;
    default:
      return null;
  }
}

/** Dust and the odd hammer spark while something is being built. */
function WorkFx({ slot }: { slot: number }) {
  return (
    <>
      <Smoke x={30} y={62} size={22} dur={5.2} peak={0.5} rise={-90} grow={1.7} tint="sepia(0.7) saturate(0.9)" puffs={2} />
      <Smoke x={70} y={56} size={18} dur={6} peak={0.42} rise={-80} grow={1.6} tint="sepia(0.7) saturate(0.9)" puffs={2} offset={1.4} />
      <HammerSparks x={42} y={44} delay={(slot % 3) * -0.4} />
      <HammerSparks x={66} y={38} size={8} delay={-0.75 - (slot % 2) * 0.3} />
    </>
  );
}

function Plot({
  city,
  slot,
  kind,
  selected,
  canUpgrade,
  serverNow,
  i18n: { t, lang },
}: {
  city: GameCity;
  slot: number;
  kind: SlotKind;
  selected: boolean;
  canUpgrade: boolean;
  serverNow: number;
  i18n: I18n;
}) {
  const pos = CITY_PLOTS[slot];
  const building = city.buildings.find((b) => b.slot === slot);
  const work = city.construction?.slot === slot ? city.construction : null;
  const href = slotHref(city.id, slot);
  const zStyle: Vars = { left: `${pos.x}%`, top: `${pos.y}%`, "--z": selected ? 49 : 10 + Math.round(pos.y / 2) };
  const breathe: Vars = { "--delay": `${(-slot * 0.9).toFixed(1)}s`, "--dur": `${6 + (slot % 3) * 0.8}s` };

  if (building || work) {
    const type = building?.type ?? work!.type;
    const def = BUILDINGS[type];
    const upgrading = Boolean(building && work);
    const sprite = building ? def.image : CONSTRUCTION_IMAGE;
    const name = buildingName(type, lang);
    const label = work
      ? building
        ? t({
            en: `${name}, level ${building.level}, upgrading to level ${work.targetLevel}`,
            es: `${name}, nivel ${building.level}, mejorando a nivel ${work.targetLevel}`,
          })
        : t({ en: `${name}, under construction, level ${work.targetLevel}`, es: `${name}, en obra hacia nivel ${work.targetLevel}` })
      : t({
          en: `${name}, level ${building!.level}${canUpgrade ? ". Ready to upgrade" : ""}`,
          es: `${name}, nivel ${building!.level}${canUpgrade ? ". Podés mejorarlo" : ""}`,
        });
    return (
      <Link
        id={plotId(slot)}
        href={href}
        scroll={false}
        aria-label={label}
        aria-current={selected ? "location" : undefined}
        className="group absolute z-(--z) block -translate-x-1/2 -translate-y-[70%] rounded-2xl hover:z-50 focus-visible:z-50"
        style={{ ...zStyle, width: `${CITY_SPRITE_WIDTH}%` }}
      >
        <span
          aria-hidden
          className={clsx(
            scene.ground,
            selected
              ? [scene.groundSelected, scene.glowPulse]
              : [scene.groundHover, "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"],
          )}
          style={{ "--top": "76%" } as Vars}
        />
        {selected && (
          <span aria-hidden className={clsx(scene.ground, scene.groundRippleGold)} style={{ "--top": "76%", "--dur": "2.6s" } as Vars} />
        )}

        {/* Lifts on hover; the rim behind it lights up in gold */}
        <span
          className={clsx(
            "relative block transition-transform duration-200 ease-out motion-safe:group-hover:-translate-y-[5%] motion-safe:group-focus-visible:-translate-y-[5%]",
            selected && "motion-safe:-translate-y-[3%]",
          )}
        >
          <Image
            src={sprite}
            alt=""
            aria-hidden
            width={512}
            height={512}
            sizes="(min-width: 1024px) 10vw, 112px"
            className={clsx(scene.rim, selected && scene.rimOn)}
            draggable={false}
          />
          <span className={clsx("relative block", scene.breathe)} style={breathe}>
            <PlotMotion slot={slot} role={building ? "building" : "scaffold"}>
              <Image
                src={sprite}
                alt=""
                width={512}
                height={512}
                sizes="(min-width: 1024px) 10vw, 112px"
                className="sprite pointer-events-none h-auto w-full select-none"
                draggable={false}
              />
            </PlotMotion>
          </span>
          {upgrading && (
            <PlotMotion slot={slot} role="scaffold" className="pointer-events-none absolute inset-0">
              <ScaffoldTowers />
            </PlotMotion>
          )}
          {work ? <WorkFx slot={slot} /> : <BuildingLife type={type} />}
        </span>

        {work ? (
          <span className="absolute top-[64%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-sea-950/90 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-gold shadow-md ring-1 ring-gold/50 sm:text-xs">
            <span aria-hidden>{t({ en: `Lv ${work.targetLevel} ·`, es: `Nv ${work.targetLevel} ·` })}</span>
            <Countdown endsAt={work.endsAt} serverNow={serverNow} />
          </span>
        ) : (
          <span
            aria-hidden
            className="absolute top-[56%] left-[70%] grid size-6 place-items-center rounded-full bg-gradient-to-b from-sea-800 to-sea-950 text-xs font-black text-gold shadow-md ring-1 ring-gold/70 tabular sm:size-7 sm:text-sm"
          >
            {building!.level}
            {canUpgrade && (
              <span
                className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full bg-success text-white shadow-md ring-1 ring-gold-light/90 sm:size-[18px] motion-safe:animate-[fx-hop_2.8s_ease-in-out_infinite]"
                style={{ animationDelay: `${(-slot * 0.37).toFixed(2)}s` }}
              >
                <IconUp size={11} />
              </span>
            )}
          </span>
        )}
        <SceneRibbon
          title={name}
          sub={
            work
              ? undefined
              : canUpgrade
                ? t({ en: `Level ${building!.level} · can upgrade`, es: `Nivel ${building!.level} · se puede mejorar` })
                : t({ en: `Level ${building!.level}`, es: `Nivel ${building!.level}` })
          }
          top={84}
          reveal
        />
      </Link>
    );
  }

  const label = t(emptySlotLabel(kind));
  return (
    <Link
      id={plotId(slot)}
      href={href}
      scroll={false}
      aria-label={t({ en: `${label}. Choose what to build`, es: `${label}. Elegí qué construir` })}
      aria-current={selected ? "location" : undefined}
      className="group absolute z-(--z) grid aspect-[2/1] min-h-12 w-[10%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full hover:z-50 focus-visible:z-50"
      style={zStyle}
    >
      <span
        aria-hidden
        className={clsx(scene.ground, selected ? [scene.groundSelected, scene.glowPulse] : scene.groundEmpty)}
        style={{ "--top": "50%", "--w": "100%" } as Vars}
      />
      <span
        aria-hidden
        className={clsx(scene.ground, selected ? scene.groundRippleGold : scene.groundRipple)}
        style={{ "--top": "50%", "--w": "100%", "--delay": `${(-slot * 0.7).toFixed(1)}s`, "--dur": selected ? "2.4s" : "3.4s" } as Vars}
      />
      <span
        aria-hidden
        className={clsx("relative -translate-y-[38%]", scene.float)}
        style={{ "--delay": `${(-slot * 0.45).toFixed(2)}s` } as Vars}
      >
        <span
          className={clsx(
            scene.medallion,
            "transition-transform duration-150 ease-out group-hover:scale-110 group-focus-visible:scale-110",
            selected && "scale-110",
          )}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </span>
      </span>
      <SceneRibbon title={label} top={78} reveal />
    </Link>
  );
}

/** Two wooden scaffolding towers framing a building that is being upgraded. */
function ScaffoldTowers() {
  return (
    <>
      <Image
        src={SCAFFOLD}
        alt=""
        width={212}
        height={344}
        sizes="40px"
        className="absolute top-[22%] left-[6%] h-auto w-[24%] -scale-x-100 drop-shadow-[0_3px_2px_rgb(30_20_10/0.4)]"
        draggable={false}
      />
      <Image
        src={SCAFFOLD}
        alt=""
        width={212}
        height={344}
        sizes="40px"
        className="absolute top-[28%] right-[8%] h-auto w-[22%] drop-shadow-[0_3px_2px_rgb(30_20_10/0.4)]"
        draggable={false}
      />
    </>
  );
}
