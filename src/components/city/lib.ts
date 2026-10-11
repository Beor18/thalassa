import { BUILDINGS, CITY_SLOTS, RESOURCES, RESOURCE_INFO, type BuildingType, type ResourceBag, type SlotKind, type UnitType } from "@/game/data";
import type { PlayerState } from "@/game/engine";
import type { GameSnapshot } from "@/server/queries";
import { fmt } from "@/lib/format";

/** Pure helpers shared by the city view (server and client safe). */

export const cityHref = (cityId: string) => `/ciudad/${cityId}`;

/** Below xl the city has no side column: plot panels open as a bottom sheet (see CITY_GRID). */
export const CITY_SHEET_QUERY = "(max-width: 1279.98px)";
export const slotHref = (cityId: string, slot: number) => `/ciudad/${cityId}?slot=${slot}`;
export const plotId = (slot: number) => `plot-${slot}`;

export function slotKindOf(slot: number): SlotKind | null {
  return CITY_SLOTS.find((s) => s.slot === slot)?.kind ?? null;
}

export function parseSlot(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || !/^\d{1,2}$/.test(value)) return null;
  const slot = Number(value);
  return slotKindOf(slot) ? slot : null;
}

/** Name for a plot that has nothing built yet. */
export function emptySlotLabel(kind: SlotKind): string {
  switch (kind) {
    case "coast":
      return "Muelle libre";
    case "wall":
      return "Muralla";
    case "town_hall":
      return "Lugar de la Intendencia";
    default:
      return "Lugar libre";
  }
}

export function typesForKind(kind: SlotKind): BuildingType[] {
  return (Object.keys(BUILDINGS) as BuildingType[]).filter((t) => BUILDINGS[t].slotKind === kind);
}

/** The engine works on a PlayerState; a snapshot carries the same data split in two. */
export function asPlayer(snapshot: GameSnapshot): PlayerState {
  return { ...snapshot.player, cities: snapshot.cities };
}

/** Ships the player owns: docked in every city plus the ones sailing. */
export function totalShips(snapshot: GameSnapshot): number {
  return snapshot.cities.reduce((s, c) => s + c.ships, 0) + snapshot.missions.reduce((s, m) => s + m.ships, 0);
}

/** Rough wait for estimates ("12 min", "3 h 05 min"): no seconds, rounded up. */
export function fmtSoon(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

export function joinEs(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/** "Te falta 120 de madera." or null when the city can pay. */
export function missingText(cost: Partial<ResourceBag>, have: ResourceBag): string | null {
  const missing = RESOURCES.filter((r) => (cost[r] ?? 0) > 0 && have[r] + 1e-6 < (cost[r] ?? 0)).map(
    (r) => `${fmt(Math.ceil((cost[r] ?? 0) - have[r]))} de ${RESOURCE_INFO[r].label.toLowerCase()}`,
  );
  if (!missing.length) return null;
  return `${missing.length === 1 ? "Te falta" : "Te faltan"} ${joinEs(missing)}.`;
}

const UNIT_WORDS: Record<UnitType, [one: string, many: string]> = {
  spearman: ["lancero", "lanceros"],
  slinger: ["hondero", "honderos"],
  swordsman: ["espadachín", "espadachines"],
  hoplite: ["hoplita", "hoplitas"],
  archer: ["arquero", "arqueros"],
  catapult: ["catapulta", "catapultas"],
};

/** "1 lancero", "20 lanceros" */
export function unitCount(unit: UnitType, n: number): string {
  const [one, many] = UNIT_WORDS[unit];
  return `${fmt(n)} ${n === 1 ? one : many}`;
}

export const unitPlural = (unit: UnitType) => UNIT_WORDS[unit][1];
