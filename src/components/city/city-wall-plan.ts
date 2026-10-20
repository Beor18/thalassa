// The city wall ring: where it runs on the painted city and how it looks at each wall level.
// Every coordinate is a pixel of public/assets/scene-city.webp (1536 x 1024). The ring SVG uses the
// same viewBox, so a CITY_PLOTS position converts as x% * 15.36 and y% * 10.24.
// Tweak placement and tiers here; city-wall-art.tsx only draws what this file describes.

export type Pt = readonly [x: number, y: number];

export const WALL_VIEW = { w: 1536, h: 1024 } as const;

export type WallTierId = "palisade" | "stone" | "fortress" | "bronze" | "citadel";
export type WallMaterial = "wood" | "sandstone" | "limestone" | "bronze" | "marble";
/** SVG tower drawn when the tier has no painted sprite (see WALL_TOWER_SPRITES). */
export type TowerStyle = "watch" | "square" | "cone" | "brazier" | "gilded";

export interface WallTier {
  id: WallTierId;
  /** first wall level of the tier */
  from: number;
  material: WallMaterial;
  /** wall height and thickness (scene px) at the tier's first level */
  height: number;
  thickness: number;
  /** extra wall and tower height per level inside the tier */
  grow: number;
  tower: { style: TowerStyle; radius: number; height: number; roof: number };
  /** hanging banners on the SVG towers: none, the spots marked `banner`, or all of them */
  banners: "none" | "some" | "all";
  /** waving pennants on the tower tops (painted towers: only where the sprite sets `crown`) */
  flags: boolean;
  /** fires on the parapet between the towers, one every `every` px */
  lights: { kind: "brazier" | "torch"; every: number } | null;
  /** a slow light sweeping over the walls */
  sheen: boolean;
}

/** Wall level 0 has no ring. Tiers are picked by `from` (the highest one reached wins). */
export const WALL_TIERS: readonly WallTier[] = [
  {
    id: "palisade",
    from: 1,
    material: "wood",
    height: 18,
    thickness: 6,
    grow: 0.8,
    tower: { style: "watch", radius: 11, height: 44, roof: 12 },
    banners: "none",
    flags: false,
    lights: null,
    sheen: false,
  },
  {
    id: "stone",
    from: 5,
    material: "sandstone",
    height: 25,
    thickness: 10,
    grow: 1,
    tower: { style: "square", radius: 16, height: 46, roof: 0 },
    banners: "none",
    flags: false,
    lights: null,
    sheen: false,
  },
  {
    id: "fortress",
    from: 10,
    material: "limestone",
    height: 31,
    thickness: 12,
    grow: 1,
    tower: { style: "cone", radius: 16, height: 54, roof: 30 },
    banners: "some",
    flags: false,
    lights: null,
    sheen: false,
  },
  {
    id: "bronze",
    from: 15,
    material: "bronze",
    height: 35,
    thickness: 13,
    grow: 1,
    tower: { style: "brazier", radius: 17, height: 62, roof: 0 },
    banners: "all",
    flags: true,
    lights: { kind: "brazier", every: 105 },
    sheen: false,
  },
  {
    id: "citadel",
    from: 20,
    material: "marble",
    height: 40,
    thickness: 14,
    grow: 0.8,
    tower: { style: "gilded", radius: 18, height: 68, roof: 38 },
    banners: "all",
    flags: true,
    lights: { kind: "torch", every: 90 },
    sheen: true,
  },
];

export interface TowerSprite {
  src: string;
  /** false draws the SVG tower instead (for art that isn't in /public yet) */
  available: boolean;
  /** width multiplier on TOWER_SPRITE_WIDTH */
  scale: number;
  /** point of the image (0..1 of its box) that stands on the wall line: the base center */
  anchor: Pt;
  /** foot of a waving flag pole (0..1); leave it out when the art already flies its own pennant */
  crown?: Pt;
  /** where the painted brazier burns (0..1): a flickering glow goes there */
  fire?: Pt;
  /** glow size, % of the image width */
  fireSize?: number;
}

/**
 * Painted tower width (scene px) at scale 1. The 384 px images keep the tower in their middle half,
 * so 120 makes a tower about as wide as the gatehouse towers in b-wall.webp (plot 11), a bit over
 * half a building sprite (CITY_SPRITE_WIDTH is 207 px).
 */
export const TOWER_SPRITE_WIDTH = 120;

/**
 * Painted tower per tier: transparent 384 x 384 images, base at the bottom center. The bronze tier
 * borrows the round tower (its look comes from the wall: bronze coping and braziers on the parapet).
 */
export const WALL_TOWER_SPRITES: Record<WallTierId, TowerSprite | null> = {
  palisade: { src: "/assets/wall/tower-1.webp", available: true, scale: 0.85, anchor: [0.5, 0.93] },
  stone: { src: "/assets/wall/tower-2.webp", available: true, scale: 1, anchor: [0.5, 0.93], fire: [0.5, 0.075], fireSize: 17 },
  fortress: { src: "/assets/wall/tower-3.webp", available: true, scale: 1.08, anchor: [0.5, 0.93] },
  bronze: { src: "/assets/wall/tower-3.webp", available: true, scale: 1.16, anchor: [0.5, 0.93] },
  citadel: {
    src: "/assets/wall/tower-4.webp",
    available: true,
    scale: 1.22,
    anchor: [0.5, 0.93],
    crown: [0.5, 0.045],
    fire: [0.5, 0.32],
    fireSize: 13,
  },
};

export interface WallRun {
  id: string;
  /** first wall level that shows this stretch */
  from: number;
  /**
   * Ground line of the wall, walked with the city on the left hand (down the west side, east along
   * the south, up the east side), so the outer face is always on the right. Ends tuck under the
   * gatehouse sprite on plot 11 or run off the top of the painting.
   */
  points: Pt[];
}

export const WALL_RUNS: readonly WallRun[] = [
  {
    // West cliffs, down to the sea gate, then along the plateau edge above the beach to the gatehouse.
    id: "west",
    from: 1,
    points: [
      [296, -40],
      [300, 60],
      [322, 196],
      [342, 300],
      [368, 392],
      [404, 470],
      [428, 520],
      [452, 553],
      [494, 566],
      [560, 572],
      [650, 566],
      [735, 572],
      [850, 584],
      [966, 590],
      [1080, 594],
      [1190, 582],
      [1228, 522],
      [1258, 458],
    ],
  },
  {
    // From the gatehouse's right end over the eastern rocks and up the crest of the ridge.
    id: "east",
    from: 1,
    points: [
      [1396, 486],
      [1462, 478],
      [1476, 392],
      [1454, 300],
      [1410, 236],
      [1364, 172],
      [1322, 106],
      [1306, 56],
      [1292, -40],
    ],
  },
  {
    // Long wall from the sea gate down to the harbor tower beside the docks.
    id: "harbor",
    from: 5,
    points: [
      [494, 566],
      [492, 620],
      [490, 676],
    ],
  },
];

export interface WallTowerSpot {
  id: string;
  /** base center, on a wall run */
  at: Pt;
  /** first wall level that shows this tower */
  from: number;
  /** hangs a banner at tiers with banners "some" */
  banner?: boolean;
  /** corner and harbor towers are a little larger */
  big?: boolean;
  /** SVG towers only: from this wall level on the tower is an open brazier (the harbor light) */
  beacon?: number;
}

export const WALL_TOWERS: readonly WallTowerSpot[] = [
  { id: "nw", at: [322, 196], from: 5 },
  { id: "w", at: [368, 392], from: 1, banner: true },
  { id: "sea-w", at: [428, 520], from: 5, banner: true },
  { id: "sea-e", at: [494, 566], from: 1, banner: true },
  { id: "s1", at: [735, 572], from: 5 },
  { id: "s2", at: [966, 590], from: 1, banner: true },
  { id: "se", at: [1190, 582], from: 5, big: true },
  { id: "e", at: [1462, 478], from: 1, big: true, banner: true },
  { id: "ridge-1", at: [1454, 300], from: 5 },
  { id: "ridge-2", at: [1364, 172], from: 10, banner: true },
  { id: "harbor", at: [490, 676], from: 5, big: true, beacon: 10 },
];

/** Gates in the ring (the main one is the gatehouse sprite on plot 11). `at` is on a wall run. */
export const WALL_GATES: readonly { id: string; at: Pt; width: number }[] = [{ id: "sea", at: [461, 556], width: 17 }];

/** Where the ripple of the "stones rise" moment starts: the gatehouse on plot 11. */
export const WALL_ORIGIN: Pt = [1325, 467];

export function wallTier(level: number): WallTier | null {
  let tier: WallTier | null = null;
  for (const t of WALL_TIERS) if (level >= t.from) tier = t;
  return tier;
}
