import Image from "next/image";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { ISLAND_FEATURES, ISLAND_FEATURE_IMAGE, ISLAND_PLOT_POS } from "@/game/layout";
import type { IslandView } from "@/server/queries";
import { Countdown } from "@/components/ui/countdown";
import { ResIcon } from "@/components/ui/res";
import { IconFlag, IconSwords, IconTemple } from "./icons";
import { MINE_NAME } from "./names";
import { PanelLink } from "./panel-host";
import { ScrollFrame } from "./scroll-frame";
import { Sprite, Token } from "./sprite";

type Side = "below" | "left" | "above";
/** Label placement per coastal plot, chosen so labels never cover a neighbouring sprite. */
const PLOT_LABEL_SIDE: Side[] = ["below", "below", "below", "below", "below", "left", "left", "above"];
type Tone = "mine" | "rival" | "feature";

const at = (pos: { x: number; y: number }, width: number): CSSProperties => ({
  left: `${pos.x}%`,
  top: `${pos.y}%`,
  width: `${width}%`,
});

function Label({ side, tone, title, sub }: { side: Side; tone: Tone; title: ReactNode; sub?: ReactNode }) {
  return (
    <span
      className={clsx(
        "absolute flex flex-col rounded-lg px-2 py-0.5 whitespace-nowrap shadow-lg ring-1 transition",
        "group-hover:brightness-110 group-aria-[current=true]:ring-2 group-aria-[current=true]:ring-gold",
        side === "below" && "top-[88%] left-1/2 -translate-x-1/2 items-center text-center",
        side === "above" && "bottom-[92%] left-1/2 -translate-x-1/2 items-center text-center",
        side === "left" && "top-1/2 right-[88%] -translate-y-1/2 items-end text-right",
        tone === "mine" && "bg-gold text-ink ring-bronze-dark/50",
        tone === "rival" && "bg-sea-950/85 text-foam ring-foam/25",
        tone === "feature" && "bg-parchment text-ink ring-parchment-3",
      )}
    >
      <span className="max-w-36 truncate text-[13px] leading-tight font-extrabold">{title}</span>
      {sub && <span className="max-w-36 truncate text-xs leading-tight opacity-85">{sub}</span>}
    </span>
  );
}

/** Interactive spot over the painting: sprite + label, opens a panel. */
function Spot({
  panel,
  pos,
  width,
  focus,
  label,
  children,
}: {
  panel: string;
  pos: { x: number; y: number };
  width: number;
  focus?: boolean;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <PanelLink
      panel={panel}
      data-focus={focus ? "" : undefined}
      style={at(pos, width)}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl focus-visible:outline-offset-4"
    >
      <span className="relative grid aspect-square w-full place-items-center transition-transform duration-200 ease-out group-hover:-translate-y-1 group-aria-[current=true]:-translate-y-1">
        {children}
      </span>
      {label}
    </PanelLink>
  );
}

export function IslandScene({ island, activeCityId, now }: { island: IslandView; activeCityId: string; now: number }) {
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
        <div className="relative aspect-[3/2] w-full min-w-[760px]">
          <Image
            src="/assets/scene-island.webp"
            alt=""
            fill
            priority
            draggable={false}
            sizes="(min-width: 1280px) 820px, (min-width: 1024px) 60vw, 760px"
            className="pointer-events-none object-cover select-none"
          />

          <Spot
            panel="sawmill"
            pos={ISLAND_FEATURES.sawmill}
            width={11}
            label={<Label side="below" tone="feature" title="Aserradero" sub={`Nivel ${island.sawmill.level}`} />}
          >
            <Sprite
              src={ISLAND_FEATURE_IMAGE.sawmill}
              fallback={
                <Token>
                  <ResIcon kind="wood" size={30} />
                </Token>
              }
            />
          </Spot>

          <Spot
            panel="mine"
            pos={ISLAND_FEATURES.mine}
            width={11}
            label={<Label side="below" tone="feature" title={MINE_NAME[island.resource]} sub={`Nivel ${island.mine.level}`} />}
          >
            <Sprite
              src={ISLAND_FEATURE_IMAGE[island.resource]}
              fallback={
                <Token>
                  <ResIcon kind={island.resource} size={30} />
                </Token>
              }
            />
          </Spot>

          <Spot
            panel="camp"
            pos={ISLAND_FEATURES.barbarians}
            width={10}
            label={
              <Label
                side="below"
                tone={rebuilding ? "rival" : "feature"}
                title="Bárbaros"
                sub={
                  rebuilding ? (
                    <>
                      Reconstruyendo · <Countdown endsAt={rebuilding} serverNow={now} />
                    </>
                  ) : (
                    `Nivel ${island.barbarians.level}`
                  )
                }
              />
            }
          >
            <span className={clsx("grid w-full place-items-center", rebuilding && "opacity-70 grayscale")}>
              <Sprite
                src={ISLAND_FEATURE_IMAGE.barbarians}
                fallback={
                  <Token tone="danger">
                    <IconSwords size={26} />
                  </Token>
                }
              />
            </span>
            <span
              aria-hidden
              className="tabular absolute top-[4%] right-[4%] grid size-7 place-items-center rounded-full bg-terracotta text-sm font-black text-marble shadow ring-2 ring-marble/80"
            >
              {island.barbarians.level}
            </span>
          </Spot>

          {ISLAND_PLOT_POS.map((pos, slot) => {
            const c = island.cities.find((x) => x.slot === slot);
            if (!c) {
              return (
                <PanelLink
                  key={slot}
                  panel={`plot-${slot}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className="group absolute z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                  title="Lugar libre"
                >
                  <span className="grid size-8 place-items-center rounded-full border-2 border-dashed border-marble/80 bg-sea-950/35 text-marble/90 shadow transition group-hover:scale-110 group-hover:bg-sea-950/55 group-aria-[current=true]:scale-110 group-aria-[current=true]:border-solid group-aria-[current=true]:border-gold group-aria-[current=true]:text-gold">
                    <IconFlag size={14} />
                  </span>
                  <span className="sr-only">Lugar libre {slot + 1}</span>
                </PanelLink>
              );
            }
            const isActive = c.id === activeCityId;
            const focus = hasActive ? isActive : c.id === firstMine;
            return (
              <Spot
                key={slot}
                panel={`plot-${slot}`}
                pos={pos}
                width={8}
                focus={focus}
                label={
                  <Label
                    side={PLOT_LABEL_SIDE[slot]}
                    tone={c.isMine ? "mine" : "rival"}
                    title={c.name}
                    sub={isActive ? `${c.playerName} · estás acá` : c.playerName}
                  />
                }
              >
                <Sprite
                  src={ISLAND_FEATURE_IMAGE.city}
                  fallback={
                    <Token tone={c.isMine ? "gold" : "parchment"} className="w-[70%]">
                      <IconTemple size={24} />
                    </Token>
                  }
                />
                {isActive && (
                  <span aria-hidden className="absolute -top-1 right-0 grid size-6 place-items-center rounded-full bg-gold text-ink shadow ring-2 ring-marble">
                    <IconFlag size={13} />
                  </span>
                )}
              </Spot>
            );
          })}
        </div>
      </ScrollFrame>
      <p className="px-2 pt-1.5 pb-0.5 text-xs text-foam/75 md:hidden">Deslizá el mapa para ver toda la isla.</p>
    </div>
  );
}
