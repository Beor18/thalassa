import type { AdvisorHint } from "@/game/engine";
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
*/
let last: ChromeData | null = null;
let lastAdvisorTitle: string | null | undefined;

export function rememberChrome(data: ChromeData) {
  last = data;
}

export function readChrome() {
  return last;
}

export const subscribeNever = () => () => {};

/** A hint is new when this tab never showed it. Pure: reading does not mark it as seen. */
export function isNewAdvisor(title: string) {
  return lastAdvisorTitle !== title;
}

export function markAdvisorSeen(title: string | null) {
  lastAdvisorTitle = title;
}
