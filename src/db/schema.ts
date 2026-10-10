import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LuxuryResource, ResourceBag, TechId, UnitBag } from "@/game/data";
import type { BuildingState, Construction, TrainingBatch } from "@/game/engine";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull().unique(),
  name: text("name").notNull(),
  gold: doublePrecision("gold").notNull(),
  research: doublePrecision("research").notNull().default(0),
  ambrosia: integer("ambrosia").notNull().default(0),
  /** ambrosia_total last read from the player's on-chain Citizen account */
  ambrosiaSynced: bigint("ambrosia_synced", { mode: "number" }).notNull().default(0),
  techs: jsonb("techs").$type<TechId[]>().notNull().default([]),
  lastTick: ts("last_tick").notNull(),
  /** last time the game faucet sent devnet SOL to this wallet */
  faucetClaimedAt: ts("faucet_claimed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const islands = pgTable(
  "islands",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    resource: text("resource").$type<LuxuryResource>().notNull(),
    variant: integer("variant").notNull().default(0),
    sawmillLevel: integer("sawmill_level").notNull().default(1),
    sawmillDonated: doublePrecision("sawmill_donated").notNull().default(0),
    mineLevel: integer("mine_level").notNull().default(1),
    mineDonated: doublePrecision("mine_donated").notNull().default(0),
    barbarianLevel: integer("barbarian_level").notNull().default(1),
    barbarianDefeatedAt: ts("barbarian_defeated_at"),
  },
  (t) => [uniqueIndex("islands_xy").on(t.x, t.y)],
);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    islandId: integer("island_id")
      .notNull()
      .references(() => islands.id),
    slot: integer("slot").notNull(),
    name: text("name").notNull(),
    isCapital: boolean("is_capital").notNull().default(false),
    wood: doublePrecision("wood").notNull(),
    wine: doublePrecision("wine").notNull(),
    marble: doublePrecision("marble").notNull(),
    crystal: doublePrecision("crystal").notNull(),
    sulfur: doublePrecision("sulfur").notNull(),
    population: doublePrecision("population").notNull(),
    woodWorkers: integer("wood_workers").notNull().default(0),
    luxWorkers: integer("lux_workers").notNull().default(0),
    scientists: integer("scientists").notNull().default(0),
    wineLevel: integer("wine_level").notNull().default(0),
    ships: integer("ships").notNull().default(0),
    buildings: jsonb("buildings").$type<BuildingState[]>().notNull(),
    units: jsonb("units").$type<UnitBag>().notNull().default({}),
    construction: jsonb("construction").$type<Construction | null>(),
    training: jsonb("training").$type<TrainingBatch[]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cities_island_slot").on(t.islandId, t.slot), index("cities_player").on(t.playerId)],
);

export type MissionKind = "transport" | "attack" | "colonize";
export type MissionStatus = "outbound" | "returning" | "done";

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MissionKind>().notNull(),
    status: text("status").$type<MissionStatus>().notNull(),
    originCityId: uuid("origin_city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    targetCityId: uuid("target_city_id").references(() => cities.id, { onDelete: "set null" }),
    targetIslandId: integer("target_island_id")
      .notNull()
      .references(() => islands.id),
    targetSlot: integer("target_slot"),
    colonyName: text("colony_name"),
    ships: integer("ships").notNull(),
    units: jsonb("units").$type<UnitBag>().notNull().default({}),
    cargo: jsonb("cargo").$type<Partial<ResourceBag>>().notNull().default({}),
    departsAt: ts("departs_at").notNull(),
    arrivesAt: ts("arrives_at").notNull(),
    returnsAt: ts("returns_at"),
  },
  (t) => [
    index("missions_due_out").on(t.status, t.arrivesAt),
    index("missions_due_back").on(t.status, t.returnsAt),
    index("missions_player").on(t.playerId),
  ],
);

export type ReportKind = "battle" | "transport" | "colony" | "system";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ReportKind>().notNull(),
    title: text("title").notNull(),
    body: jsonb("body").$type<Record<string, unknown>>().notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("reports_player_created").on(t.playerId, t.createdAt)],
);

export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  wallet: text("wallet").notNull(),
  message: text("message").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const ambrosiaLedger = pgTable(
  "ambrosia_ledger",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    ref: text("ref"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("ambrosia_ledger_player").on(t.playerId)],
);

// ---------------------------------------------------------------------------
// Growth: first-party funnel events and referrals (src/server/growth/*)
// ---------------------------------------------------------------------------

export type AnalyticsProps = Record<string, string | number | boolean>;

/** First-party product events. No PII: no IPs, no user agents, no emails. `sid` is a random per-tab id. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
    sid: text("sid"),
    props: jsonb("props").$type<AnalyticsProps>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("analytics_events_name_created").on(t.name, t.createdAt),
    index("analytics_events_player_name").on(t.playerId, t.name),
  ],
);

/** Who invited whom. One row per invitee, linked only when the invitee's account is created. */
export const referrals = pgTable(
  "referrals",
  {
    inviteeId: uuid("invitee_id")
      .primaryKey()
      .references(() => players.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    /** set once, when both players got the reward */
    rewardedAt: ts("rewarded_at"),
  },
  (t) => [index("referrals_referrer").on(t.referrerId, t.rewardedAt)],
);
