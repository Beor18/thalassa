import { BUILDINGS, CITY_SLOTS, RESOURCES, type BuildingType, type Resource, type ResourceBag, type SlotKind, type UnitType } from "@/game/data";
import type { PlayerState } from "@/game/engine";
import { resourceLabel, unitName } from "@/game/names";
import type { Locale, Text } from "@/i18n/config";
import { getFormat } from "@/i18n/format";
import type { GameSnapshot } from "@/server/queries";

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
export function emptySlotLabel(kind: SlotKind): Text {
  switch (kind) {
    case "coast":
      return { en: "Free dock", es: "Muelle libre" };
    case "wall":
      return { en: "Town wall", es: "Muralla" };
    case "town_hall":
      return { en: "Town Hall site", es: "Lugar de la Intendencia" };
    default:
      return { en: "Free plot", es: "Lugar libre" };
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

/** Rough wait for estimates ("12 min", "3 h 05 min"): no seconds, rounded up. Reads the same in every language. */
export function fmtSoon(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

/** "a, b and c" (en) or "a, b y c" (es). */
export function joinList(parts: string[], lang: Locale): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "y"} ${parts[parts.length - 1]}`;
}

/** Resources a city is short of to pay `cost`, with how much is missing. */
export function shortfall(cost: Partial<ResourceBag>, have: ResourceBag): { resource: Resource; amount: number }[] {
  return RESOURCES.filter((r) => (cost[r] ?? 0) > 0 && have[r] + 1e-6 < (cost[r] ?? 0)).map((r) => ({
    resource: r,
    amount: Math.ceil((cost[r] ?? 0) - have[r]),
  }));
}

/** "You need 120 more wood." / "Te falta 120 de madera.", or null when the city can pay. */
export function missingText(cost: Partial<ResourceBag>, have: ResourceBag, lang: Locale): string | null {
  const short = shortfall(cost, have);
  if (!short.length) return null;
  const { fmt } = getFormat(lang);
  const parts = short.map(({ resource, amount }) => {
    const name = resourceLabel(resource, lang).toLowerCase();
    return lang === "en" ? `${fmt(amount)} more ${name}` : `${fmt(amount)} de ${name}`;
  });
  if (lang === "en") return `You need ${joinList(parts, lang)}.`;
  return `${parts.length === 1 ? "Te falta" : "Te faltan"} ${joinList(parts, lang)}.`;
}

/** "1 spearman", "20 spearmen" / "1 lancero", "20 lanceros" */
export function unitCount(unit: UnitType, n: number, lang: Locale): string {
  return `${getFormat(lang).fmt(n)} ${unitName(unit, lang, n).toLowerCase()}`;
}

export const unitPlural = (unit: UnitType, lang: Locale) => unitName(unit, lang, 2).toLowerCase();

