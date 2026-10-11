// Static game definitions. Pure data, safe to import from server and client.

export const RESOURCES = ["wood", "wine", "marble", "crystal", "sulfur"] as const;
export type Resource = (typeof RESOURCES)[number];
export type LuxuryResource = Exclude<Resource, "wood">;
export const LUXURY_RESOURCES: LuxuryResource[] = ["wine", "marble", "crystal", "sulfur"];
export type ResourceBag = Record<Resource, number>;

export const RESOURCE_INFO: Record<Resource | "gold" | "research" | "citizens" | "ambrosia", { label: string; icon: string }> = {
  wood: { label: "Madera", icon: "/assets/r-wood.webp" },
  wine: { label: "Vino", icon: "/assets/r-wine.webp" },
  marble: { label: "Mármol", icon: "/assets/r-marble.webp" },
  crystal: { label: "Cristal", icon: "/assets/r-crystal.webp" },
  sulfur: { label: "Azufre", icon: "/assets/r-sulfur.webp" },
  gold: { label: "Oro", icon: "/assets/r-gold.webp" },
  research: { label: "Investigación", icon: "/assets/r-research.webp" },
  citizens: { label: "Ciudadanos", icon: "/assets/r-citizens.webp" },
  ambrosia: { label: "Néctar", icon: "/assets/r-ambrosia.webp" },
};

export const emptyBag = (): ResourceBag => ({ wood: 0, wine: 0, marble: 0, crystal: 0, sulfur: 0 });

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export const BUILDING_TYPES = [
  "town_hall",
  "academy",
  "warehouse",
  "tavern",
  "museum",
  "barracks",
  "port",
  "wall",
  "carpenter",
  "stonemason",
  "palace",
] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export type SlotKind = "town_hall" | "land" | "wall" | "coast";

export interface BuildingDef {
  type: BuildingType;
  name: string;
  description: string;
  image: string;
  slotKind: SlotKind;
  unique: boolean;
  maxLevel: number;
  /** wood cost at level 1 and growth factor */
  wood: [base: number, factor: number];
  /** marble cost at `from` level, then grows by factor */
  marble?: [base: number, factor: number, from: number];
  crystal?: [base: number, factor: number, from: number];
  /** build seconds at level 1 (game speed 1) and growth factor */
  time: [base: number, factor: number];
  requires?: { building?: [BuildingType, number]; tech?: TechId; capitalOnly?: boolean };
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  town_hall: {
    type: "town_hall",
    name: "Intendencia",
    description: "El corazón de la polis. Cada nivel suma viviendas para tus ciudadanos.",
    image: "/assets/b-town_hall.webp",
    slotKind: "town_hall",
    unique: true,
    maxLevel: 25,
    wood: [160, 1.38],
    marble: [90, 1.42, 3],
    time: [900, 1.22],
  },
  academy: {
    type: "academy",
    name: "Academia",
    description: "Tus científicos generan puntos de investigación. Más niveles, más pupitres.",
    image: "/assets/b-academy.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 20,
    wood: [64, 1.45],
    crystal: [40, 1.45, 4],
    time: [840, 1.2],
  },
  warehouse: {
    type: "warehouse",
    name: "Depósito",
    description: "Guarda más recursos y protege una parte de los saqueos.",
    image: "/assets/b-warehouse.webp",
    slotKind: "land",
    unique: false,
    maxLevel: 25,
    wood: [160, 1.36],
    marble: [60, 1.4, 3],
    time: [720, 1.2],
  },
  tavern: {
    type: "tavern",
    name: "Taberna",
    description: "Servir vino pone contento al pueblo y la población crece más rápido.",
    image: "/assets/b-tavern.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 20,
    wood: [101, 1.42],
    marble: [50, 1.44, 4],
    time: [780, 1.2],
    requires: { building: ["town_hall", 2] },
  },
  museum: {
    type: "museum",
    name: "Museo",
    description: "La cultura también alimenta: cada nivel suma satisfacción.",
    image: "/assets/b-museum.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 15,
    wood: [560, 1.4],
    marble: [280, 1.42, 1],
    time: [1500, 1.22],
    requires: { tech: "culture" },
  },
  barracks: {
    type: "barracks",
    name: "Cuartel",
    description: "Entrená tropas para defender la polis o salir a saquear.",
    image: "/assets/b-barracks.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 20,
    wood: [49, 1.45],
    marble: [40, 1.44, 3],
    time: [660, 1.2],
    requires: { building: ["town_hall", 2] },
  },
  port: {
    type: "port",
    name: "Puerto",
    description: "Comprá barcos mercantes: llevan recursos, colonos y tropas.",
    image: "/assets/b-port.webp",
    slotKind: "coast",
    unique: false,
    maxLevel: 20,
    wood: [60, 1.42],
    marble: [40, 1.44, 3],
    time: [700, 1.2],
  },
  wall: {
    type: "wall",
    name: "Muralla",
    description: "Cada nivel suma 10% de defensa a las tropas que cuidan la ciudad.",
    image: "/assets/b-wall.webp",
    slotKind: "wall",
    unique: true,
    maxLevel: 25,
    wood: [114, 1.4],
    marble: [70, 1.42, 1],
    time: [900, 1.22],
  },
  carpenter: {
    type: "carpenter",
    name: "Carpintería",
    description: "Ahorra 2% de madera por nivel en todas las obras de la ciudad.",
    image: "/assets/b-carpenter.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 20,
    wood: [63, 1.45],
    marble: [30, 1.44, 4],
    time: [720, 1.2],
    requires: { building: ["town_hall", 3] },
  },
  stonemason: {
    type: "stonemason",
    name: "Cantero",
    description: "Sus maestros suman 3% de producción del recurso de lujo de la isla por nivel.",
    image: "/assets/b-stonemason.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 20,
    wood: [274, 1.42],
    marble: [60, 1.44, 2],
    time: [960, 1.2],
    requires: { building: ["town_hall", 4], tech: "wealth" },
  },
  palace: {
    type: "palace",
    name: "Palacio",
    description: "Sede del gobierno. Cada nivel te deja fundar una colonia más.",
    image: "/assets/b-palace.webp",
    slotKind: "land",
    unique: true,
    maxLevel: 10,
    wood: [712, 1.6],
    marble: [300, 1.6, 1],
    crystal: [120, 1.6, 2],
    time: [2400, 1.3],
    requires: { building: ["town_hall", 3], tech: "expansion", capitalOnly: true },
  },
};

// City plots. Slot ids are stable; positions on the city scene live in layout.ts.
export const CITY_SLOTS: { slot: number; kind: SlotKind }[] = [
  { slot: 0, kind: "town_hall" },
  ...Array.from({ length: 10 }, (_, i) => ({ slot: i + 1, kind: "land" as const })),
  { slot: 11, kind: "wall" },
  { slot: 12, kind: "coast" },
  { slot: 13, kind: "coast" },
];
export const ISLAND_PLOTS = 8;

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export const UNIT_TYPES = ["spearman", "slinger", "swordsman", "hoplite", "archer", "catapult"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];
export type UnitBag = Partial<Record<UnitType, number>>;

export interface UnitDef {
  type: UnitType;
  name: string;
  description: string;
  image: string;
  attack: number;
  defense: number;
  cost: Partial<ResourceBag>;
  upkeep: number; // gold per hour (speed 1)
  time: number; // seconds per unit at speed 1
  requires: { barracks: number; tech?: TechId };
}

export const UNITS: Record<UnitType, UnitDef> = {
  spearman: {
    type: "spearman",
    name: "Lancero",
    description: "Barato y firme. La primera línea de cualquier polis.",
    image: "/assets/u-spearman.webp",
    attack: 4,
    defense: 6,
    cost: { wood: 30 },
    upkeep: 1,
    time: 90,
    requires: { barracks: 1 },
  },
  slinger: {
    type: "slinger",
    name: "Hondero",
    description: "Pega de lejos y cuesta poco. Frágil cuerpo a cuerpo.",
    image: "/assets/u-slinger.webp",
    attack: 7,
    defense: 2,
    cost: { wood: 20 },
    upkeep: 2,
    time: 120,
    requires: { barracks: 2 },
  },
  swordsman: {
    type: "swordsman",
    name: "Espadachín",
    description: "Ataque fuerte y armadura liviana. Ideal para saquear.",
    image: "/assets/u-swordsman.webp",
    attack: 12,
    defense: 6,
    cost: { wood: 30, sulfur: 30 },
    upkeep: 4,
    time: 180,
    requires: { barracks: 4 },
  },
  hoplite: {
    type: "hoplite",
    name: "Hoplita",
    description: "Escudo, lanza y falange. La mejor defensa del Egeo.",
    image: "/assets/u-hoplite.webp",
    attack: 10,
    defense: 18,
    cost: { wood: 40, sulfur: 30 },
    upkeep: 3,
    time: 240,
    requires: { barracks: 5, tech: "phalanx" },
  },
  archer: {
    type: "archer",
    name: "Arquero",
    description: "Lluvia de flechas antes de que el enemigo llegue al muro.",
    image: "/assets/u-archer.webp",
    attack: 16,
    defense: 6,
    cost: { wood: 30, sulfur: 25 },
    upkeep: 4,
    time: 240,
    requires: { barracks: 7, tech: "archery" },
  },
  catapult: {
    type: "catapult",
    name: "Catapulta",
    description: "Derriba murallas. Cada dos catapultas anulan un nivel de muro.",
    image: "/assets/u-catapult.webp",
    attack: 60,
    defense: 10,
    cost: { wood: 260, sulfur: 300 },
    upkeep: 15,
    time: 600,
    requires: { barracks: 10, tech: "siege" },
  },
};

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export const TECH_IDS = [
  "conservation",
  "pulley",
  "wealth",
  "wine_culture",
  "geometry",
  "architecture",
  "wisdom",
  "paper",
  "expansion",
  "culture",
  "drill",
  "phalanx",
  "archery",
  "siege",
  "shipbuilding",
  "cartography",
] as const;
export type TechId = (typeof TECH_IDS)[number];
export type TechBranch = "economy" | "science" | "military" | "seafaring";

export interface TechDef {
  id: TechId;
  name: string;
  branch: TechBranch;
  cost: number;
  requires?: TechId;
  effect: string;
}

export const TECH_BRANCHES: Record<TechBranch, string> = {
  economy: "Economía",
  science: "Ciencia",
  military: "Guerra",
  seafaring: "Navegación",
};

export const TECHS: Record<TechId, TechDef> = {
  conservation: { id: "conservation", name: "Conservación", branch: "economy", cost: 30, effect: "+20% de capacidad en los depósitos." },
  pulley: { id: "pulley", name: "Poleas", branch: "economy", cost: 60, requires: "conservation", effect: "-10% de madera en todas las obras." },
  wealth: { id: "wealth", name: "Riqueza", branch: "economy", cost: 90, requires: "conservation", effect: "Habilita trabajadores en la mina de lujo de la isla y el Cantero." },
  wine_culture: { id: "wine_culture", name: "Viticultura", branch: "economy", cost: 150, requires: "wealth", effect: "Las tabernas gastan 20% menos vino." },
  geometry: { id: "geometry", name: "Geometría", branch: "economy", cost: 260, requires: "pulley", effect: "-10% de mármol en todas las obras." },
  architecture: { id: "architecture", name: "Arquitectura", branch: "economy", cost: 520, requires: "geometry", effect: "Las obras terminan 10% más rápido." },
  wisdom: { id: "wisdom", name: "Sabiduría", branch: "science", cost: 40, effect: "+10% de investigación." },
  paper: { id: "paper", name: "Papiro", branch: "science", cost: 200, requires: "wisdom", effect: "+15% de investigación." },
  expansion: { id: "expansion", name: "Expansión", branch: "science", cost: 180, requires: "wisdom", effect: "Habilita el Palacio y fundar colonias." },
  culture: { id: "culture", name: "Cultura", branch: "science", cost: 300, requires: "paper", effect: "Habilita el Museo." },
  drill: { id: "drill", name: "Instrucción", branch: "military", cost: 50, effect: "El entrenamiento dura 10% menos." },
  phalanx: { id: "phalanx", name: "Falange", branch: "military", cost: 120, requires: "drill", effect: "Habilita Hoplitas." },
  archery: { id: "archery", name: "Arquería", branch: "military", cost: 220, requires: "phalanx", effect: "Habilita Arqueros." },
  siege: { id: "siege", name: "Asedio", branch: "military", cost: 480, requires: "archery", effect: "Habilita Catapultas." },
  shipbuilding: { id: "shipbuilding", name: "Carpintería naval", branch: "seafaring", cost: 45, effect: "Los barcos cuestan 15% menos oro." },
  cartography: { id: "cartography", name: "Cartografía", branch: "seafaring", cost: 160, requires: "shipbuilding", effect: "Los viajes por mar son 25% más rápidos." },
};

// ---------------------------------------------------------------------------
// Balance constants (per hour, at game speed 1)
// ---------------------------------------------------------------------------

export const BALANCE = {
  woodPerWorker: 1,
  luxuryPerWorker: 0.75,
  goldPerCitizen: 3,
  scientistUpkeep: 3,
  researchPerScientist: 1,
  baseHappiness: 196,
  capitalHappiness: 50,
  tavernHappinessPerLevel: 12,
  winePerServedLevel: 60,
  museumHappinessPerLevel: 20,
  growthFactor: 0.02,
  baseStorage: 2500,
  storagePerWarehouseLevel: 3500,
  safeBase: 100,
  safePerWarehouseLevel: 400,
  shipCapacity: 500,
  unitsPerShip: 50,
  baseShipPrice: 400,
  shipPriceFactor: 1.15,
  travelSameIsland: 600,
  travelPerDistance: 1200,
  colonizeCost: { wood: 1250, gold: 3000, citizens: 40 },
  ambrosiaPerMinute: 1,
  merchantAmbrosia: 20,
  merchantAmount: 1000,
  /** anti pay-to-win caps (see docs/negocio/modelo-de-negocio.md) */
  finishDailyCap: 300,
  trainingFinishMaxMinutes: 60,
  merchantPerCityPerDay: 3,
  barbarianCooldown: 4 * 3600,
  newbieProtectionHours: 72,
  startingResources: { wood: 1000, wine: 300, marble: 400, crystal: 150, sulfur: 150 } satisfies ResourceBag,
  startingGold: 1500,
  startingPopulation: 40,
} as const;

export const MAX_STEP_MS = 5 * 60 * 1000;
