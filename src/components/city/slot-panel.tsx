import type { CSSProperties } from "react";
import { BUILDINGS } from "@/game/data";
import { fx } from "@/components/fx/classes";
import type { Game } from "@/server/game-context";
import { BuildMenu, EMPTY_SLOT_HINT } from "./build-menu";
import { BuildingInfo, BuildingSection, FUNCTION_FIRST, LevelChip } from "./building-sections";
import { cityHref, emptySlotLabel, slotKindOf } from "./lib";
import { SlotDrawer } from "./slot-drawer";
import { ConstructionBlock, UpgradeBlock } from "./work-blocks";

/**
 * Panel for the plot in `?slot=N`: build menu, construction in progress or the building itself.
 * Every building panel reads the same way: header (sprite, level, ⓘ), the upgrade or the running
 * work, then what the building does.
 */
export function SlotPanel({ game, slot }: { game: Game; slot: number }) {
  const { city } = game;
  const kind = slotKindOf(slot);
  if (!kind) return null;
  const closeHref = cityHref(city.id);
  const building = city.buildings.find((b) => b.slot === slot);
  const working = city.construction?.slot === slot;

  if (!building) {
    if (working && city.construction) {
      const def = BUILDINGS[city.construction.type];
      return (
        <SlotDrawer
          slot={slot}
          closeHref={closeHref}
          title={def.name}
          image={def.image}
          chip={<span className="rounded-full bg-gold/30 px-2 py-px text-xs font-extrabold text-bronze-deep ring-1 ring-gold">En obra</span>}
          info={<BuildingInfo game={game} type={def.type} level={city.construction.targetLevel} />}
        >
          <ConstructionBlock game={game} />
        </SlotDrawer>
      );
    }
    return (
      <SlotDrawer
        slot={slot}
        closeHref={closeHref}
        title={emptySlotLabel(kind)}
        icon={
          <span className={fx.medallion} style={{ "--m": "40px" } as CSSProperties}>
            <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M8 3v10M3 8h10" />
            </svg>
          </span>
        }
        subtitle={EMPTY_SLOT_HINT[kind]}
      >
        <BuildMenu game={game} slot={slot} kind={kind} />
      </SlotDrawer>
    );
  }

  const def = BUILDINGS[building.type];
  return (
    <SlotDrawer
      slot={slot}
      closeHref={closeHref}
      title={def.name}
      image={def.image}
      chip={<LevelChip level={building.level} max={def.maxLevel} />}
      info={<BuildingInfo game={game} type={building.type} level={building.level} />}
    >
      {working ? <ConstructionBlock game={game} /> : <UpgradeBlock game={game} building={building} primary={!FUNCTION_FIRST.has(building.type)} />}
      <BuildingSection game={game} building={building} />
    </SlotDrawer>
  );
}
