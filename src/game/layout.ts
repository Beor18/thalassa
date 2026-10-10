// Positions (in % of the painted scene) of every interactive spot.
// Measured on public/assets/scene-city.webp and scene-island.webp (3:2 images).

export const SCENE_ASPECT = 1536 / 1024;

/** City plots, keyed by slot id from CITY_SLOTS. x/y = plot center. */
export const CITY_PLOTS: Record<number, { x: number; y: number }> = {
  0: { x: 51.8, y: 28.6 }, // town hall: the central plaza
  1: { x: 36.1, y: 13.7 },
  2: { x: 49.2, y: 13.7 },
  3: { x: 62.2, y: 13.9 },
  4: { x: 75.2, y: 13.9 },
  5: { x: 37.6, y: 27.8 },
  6: { x: 65.8, y: 28.3 },
  7: { x: 79.4, y: 28.9 },
  8: { x: 39.4, y: 45.4 },
  9: { x: 55.3, y: 45.1 },
  10: { x: 70.3, y: 46.1 },
  11: { x: 86.3, y: 45.6 }, // wall: the gate over the cliffs
  12: { x: 14.2, y: 60.5 }, // docks
  13: { x: 24.2, y: 64.9 },
};

/** Sprite width as % of scene width. */
export const CITY_SPRITE_WIDTH = 13.5;

/** Island plots 0..7 along the coast. */
export const ISLAND_PLOT_POS: { x: number; y: number }[] = [
  { x: 13.3, y: 37.1 },
  { x: 16.6, y: 56.2 },
  { x: 33.9, y: 64.9 },
  { x: 55.7, y: 65.4 },
  { x: 72.6, y: 58.1 },
  { x: 79.8, y: 47.9 },
  { x: 85.6, y: 36.6 },
  { x: 91.5, y: 24.9 },
];

export const ISLAND_FEATURES = {
  sawmill: { x: 30, y: 26 },
  mine: { x: 74, y: 19 },
  barbarians: { x: 89, y: 74 },
} as const;

export const ISLAND_FEATURE_IMAGE = {
  sawmill: "/assets/f-sawmill.webp",
  wine: "/assets/f-vineyard.webp",
  marble: "/assets/f-quarry.webp",
  crystal: "/assets/f-crystal.webp",
  sulfur: "/assets/f-sulfur.webp",
  barbarians: "/assets/f-barbarians.webp",
  city: "/assets/f-city.webp",
} as const;

export const ISLAND_IMAGE = {
  wine: "/assets/island-wine.webp",
  marble: "/assets/island-marble.webp",
  crystal: "/assets/island-crystal.webp",
  sulfur: "/assets/island-sulfur.webp",
} as const;

export const CONSTRUCTION_IMAGE = "/assets/b-construction.webp";
export const SHIP_IMAGE = "/assets/u-ship.webp";
