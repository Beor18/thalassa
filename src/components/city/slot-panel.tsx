import { BUILDINGS } from "@/game/data";
import type { Game } from "@/server/game-context";
import { BuildMenu } from "./build-menu";
import { BuildingSection, FUNCTION_FIRST } from "./building-sections";
import { cityHref, emptySlotLabel, slotKindOf } from "./lib";
import { SlotDrawer } from "./slot-drawer";
import { BuildingIntro, ConstructionBlock, UpgradeBlock } from "./work-blocks";

/** Panel for the plot in `?slot=N`: build menu, construction in progress or the building itself. */
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
        <SlotDrawer slot={slot} closeHref={closeHref} title={def.name} eyebrow="En obra">
          <BuildingIntro type={def.type} level={0} underConstruction />
          <ConstructionBlock game={game} />
        </SlotDrawer>
      );
    }
    return (
      <SlotDrawer slot={slot} closeHref={closeHref} title={emptySlotLabel(kind)} eyebrow="Construir">
        <BuildMenu game={game} slot={slot} kind={kind} />
      </SlotDrawer>
    );
  }

  const def = BUILDINGS[building.type];
  const functionFirst = FUNCTION_FIRST.has(building.type);
  return (
    <SlotDrawer slot={slot} closeHref={closeHref} title={def.name} eyebrow={`Nivel ${building.level}`}>
      <BuildingIntro type={building.type} level={building.level} />
      {working && <ConstructionBlock game={game} />}
      {functionFirst ? (
        <>
          <BuildingSection game={game} building={building} />
          {!working && <UpgradeBlock game={game} building={building} primary={false} />}
        </>
      ) : (
        <>
          {!working && <UpgradeBlock game={game} building={building} primary />}
          <BuildingSection game={game} building={building} />
        </>
      )}
    </SlotDrawer>
  );
}
