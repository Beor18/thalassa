import type { AdvisorHint } from "@/game/engine";
import type { Locale } from "@/i18n/config";
import type { ResourceBarProps } from "./resource-bar";

/** Everything the header needs, serializable from the server shell to the client chrome. */
export interface HeaderData {
  cityId: string;
  islandId: number;
  cities: { id: string; name: string; islandName: string }[];
  playerName: string;
  speed: number;
  unreadReports: number;
  bar: ResourceBarProps;
}

export interface ChromeData {
  header: HeaderData;
  advisor: AdvisorHint | null;
}

/*
  Last header shown in this tab. While the next section streams in, the loading screen renders
  this same header (same numbers, same nav, the pill already on the new section) so the HUD never
  blinks between sections. Server renders and hydration always see `null`.
  It lives in memory only and remembers the language it was drawn in: a header from the other
  language is never replayed (switching reloads the page anyway, this is the safety net).
*/
let last: (ChromeData & { lang: Locale }) | null = null;
let lastAdvisorTitle: string | null | undefined;

export function rememberChrome(data: ChromeData, lang: Locale) {
  last = { ...data, lang };
}

export function readChrome() {
  return last;
}

export const subscribeNever = () => () => {};

/**
 * A hint is new when this tab never showed it. Pure: reading does not mark it as seen.
 * Keyed by the hint's English title, so the same hint stays known in either language.
 */
export function isNewAdvisor(title: string) {
  return lastAdvisorTitle !== title;
}

export function markAdvisorSeen(title: string | null) {
  lastAdvisorTitle = title;
}
