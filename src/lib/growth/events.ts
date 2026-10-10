/** Events the browser may send through POST /api/t (shared by the beacon and the route). */
export const CLIENT_EVENTS = [
  "landing_view",
  "play_click",
  "wallet_choose",
  "invite_copy",
  "invite_share",
  "polis_view",
  "polis_cta_click",
] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];
