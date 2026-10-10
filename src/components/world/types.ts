import type { Resource } from "@/game/data";

export type FleetKind = "transport" | "attack" | "colonize";

/** A mission at sea, reduced to what the map needs to sail it. */
export interface FleetView {
  id: string;
  kind: FleetKind;
  status: "outbound" | "returning";
  /** island of the city that sent it */
  homeIslandId: number;
  targetIslandId: number;
  originName: string;
  targetLabel: string;
  ships: number;
  departsAt: number;
  arrivesAt: number;
  returnsAt: number | null;
  /** goods on board: cargo on the way out, loot on the way back */
  cargo: Partial<Record<Resource, number>>;
}

/** Art for the living sea. Each entry falls back gracefully when the file is missing. */
export interface WorldFx {
  sea: string;
  /** tile size of the sea texture in world pixels */
  seaSize: number;
  caustics: string | null;
  clouds: string[];
  gull: string | null;
  compass: string | null;
  ship: string;
  /** true when `ship` is drawn from above with the bow pointing up */
  shipTopDown: boolean;
  sparkle: string | null;
  smoke: string | null;
}

export interface MyCity {
  id: string;
  name: string;
  islandId: number;
}
