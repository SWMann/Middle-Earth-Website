/**
 * The `game.*` schema — OWNED by the mod.
 *
 * In production these tables are written by the Minecraft-server-side mod
 * via its own database role (`mod_writer`). The website's database role
 * (`web_user`) has SELECT-only on this schema; any write the website wants
 * to make must go through the mod's HTTP API.
 *
 * During Phase 2 (read-only world) the mod itself isn't running yet, so a
 * dev seed script (`pnpm db:seed`) stands in for the mod's startup writes.
 * When the mod is implemented, the seed becomes its initial-state fixture.
 *
 * Scope of this Phase 2 cut: only the tables the read-only world needs to
 * render — factions (+ subfactions via parent_faction_id), regions, claims,
 * and a stripped-down settlements row. Districts, units, armies, trade
 * routes, characters, etc. come in Phase 3.
 *
 * Mod-spec reference: §3.2.
 */

import {
  pgSchema,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  primaryKey,
  bigserial,
} from "drizzle-orm/pg-core";

export const game = pgSchema("game");

// --- Factions --------------------------------------------------------------

/**
 * Major and minor factions. Subfactions are represented as factions with
 * `parentFactionId` set — same table, recursive FK. Subfactions don't have
 * their own treasury rows; treasury_coin / treasury_dp are zero and never
 * written for them. Earmarks (Phase 3) describe the subfaction's share.
 */
export const factions = game.table("factions", {
  id: text("id").primaryKey(), // e.g. 'gondor', 'mordor', 'dol_amroth'
  displayName: text("display_name").notNull(),
  alignment: text("alignment").notNull(), // 'good' | 'evil' | 'neutral'
  parentFactionId: text("parent_faction_id"), // null = major; set = subfaction
  leaderUuid: text("leader_uuid"), // mc_uuid of current FL, nullable
  treasuryCoin: bigint("treasury_coin", { mode: "number" }).notNull().default(0),
  treasuryDp: bigint("treasury_dp", { mode: "number" }).notNull().default(0),
  loreSummary: text("lore_summary").notNull().default(""),
  bannerHex: text("banner_hex"), // optional faction colour, e.g. '#1d4ed8'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  succeededFrom: text("succeeded_from"), // if seceded from another faction
});

export const factionTraits = game.table(
  "faction_traits",
  {
    factionId: text("faction_id")
      .notNull()
      .references(() => factions.id),
    traitId: text("trait_id").notNull(), // e.g. 'widespread_territory'
    configJson: jsonb("config_json").$type<Record<string, unknown>>(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.factionId, t.traitId] }),
  }),
);

// --- Regions ---------------------------------------------------------------

/**
 * A `region` is a named tile on the world map — the unit factions claim,
 * survey, and route trade through. ID is human-readable ('AR43', 'MM19')
 * rather than autonumber so URLs and logs stay legible.
 */
export const regions = game.table("regions", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  biome: text("biome").notNull(), // 'mountain' | 'forest' | 'plain' | 'water' | 'desert'
  centreX: integer("centre_x").notNull(),
  centreZ: integer("centre_z").notNull(),
  radiusBlocks: integer("radius_blocks").notNull().default(1000),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const regionClaims = game.table("region_claims", {
  regionId: text("region_id")
    .primaryKey()
    .references(() => regions.id),
  factionId: text("faction_id")
    .notNull()
    .references(() => factions.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  claimDpCost: integer("claim_dp_cost").notNull().default(0),
});

// --- Settlements -----------------------------------------------------------

/**
 * Phase 2 cut: name, faction, region, tier, population numbers, founded,
 * approved. Districts/build plans/garrison/trade routes follow in Phase 3.
 */
export const settlements = game.table("settlements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  factionId: text("faction_id")
    .notNull()
    .references(() => factions.id),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
  tier: text("tier").notNull(), // 'hamlet' | 'steading' | ... | 'capital'
  population: integer("population").notNull().default(0),
  populationCap: integer("population_cap").notNull().default(0),
  centreX: integer("centre_x").notNull(),
  centreZ: integer("centre_z").notNull(),
  foundedAt: timestamp("founded_at", { withTimezone: true }).notNull().defaultNow(),
  approved: text("approved").notNull().default("true"), // 'true' | 'false'; text for now
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

// --- Characters -----------------------------------------------------------

/**
 * The player-character. Cross-schema reference to web.accounts.discord_id
 * (TEXT) — the player owns the character; the character belongs to a faction.
 *
 * In our model each player has one active character at a time, but the table
 * supports multiple via status='retired' / 'dead'. The active-character
 * lookup is "the character for this player_discord_id where status='active'".
 *
 * Heir reference is self-referential; FK is declared in a later migration to
 * sidestep Drizzle's chicken-and-egg with same-table FKs at definition time.
 */
export const characters = game.table("characters", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  playerDiscordId: text("player_discord_id").notNull(), // FK to web.accounts.discord_id
  factionId: text("faction_id")
    .notNull()
    .references(() => factions.id),
  name: text("name").notNull(),
  race: text("race").notNull(), // 'man' | 'elf' | 'dwarf' | 'hobbit' | 'orc' | ...
  title: text("title"), // optional displayed title, e.g. 'Steward of Gondor'
  birthYearRp: integer("birth_year_rp").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'retired' | 'dead'
  woundScore: integer("wound_score").notNull().default(0),
  influence: integer("influence").notNull().default(0),
  heirCharacterId: bigint("heir_character_id", { mode: "number" }),
  currentRegionId: text("current_region_id").references(() => regions.id),
  biography: text("biography").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  diedAt: timestamp("died_at", { withTimezone: true }),
});

// --- Districts ------------------------------------------------------------

/**
 * A district occupies a settlement. Categories drive UI filtering and rule
 * checks (Residential adds population_cap, Agricultural produces food, etc.).
 * The detailed schema lives in `config.district_types` (Phase 3+); this row
 * carries just the instance state.
 */
export const districts = game.table("districts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  settlementId: bigint("settlement_id", { mode: "number" })
    .notNull()
    .references(() => settlements.id),
  districtType: text("district_type").notNull(), // 'cottage' | 'wheat_farm' | 'barracks' | ...
  category: text("category").notNull(), // 'residential' | 'agricultural' | 'industrial' | ...
  popCost: integer("pop_cost").notNull().default(0),
  active: text("active").notNull().default("true"), // 'true' | 'false'; text for now
  builtAt: timestamp("built_at", { withTimezone: true }).notNull().defaultNow(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
});

// --- Units ---------------------------------------------------------------

/**
 * A stack of units of a single type. Per mod-spec, a unit always exists at
 * either a settlement (garrisoned) or an army (mobilised) — exactly one of
 * the two location fields is non-null at any time.
 */
export const units = game.table("units", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  unitType: text("unit_type").notNull(), // 'citadel_guard' | 'rohirrim' | ...
  factionId: text("faction_id")
    .notNull()
    .references(() => factions.id),
  count: integer("count").notNull(),
  garrisonedAt: bigint("garrisoned_at", { mode: "number" }).references(() => settlements.id),
  mobilisedInArmyId: bigint("mobilised_in_army_id", { mode: "number" }),
});

// --- Armies --------------------------------------------------------------

/**
 * A mobilised group of units led by a character. Currently in transit toward
 * destinationRegionId; arrives at `arrivesAt`.
 */
export const armies = game.table("armies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ledByCharacterId: bigint("led_by_character_id", { mode: "number" })
    .notNull()
    .references(() => characters.id),
  factionId: text("faction_id")
    .notNull()
    .references(() => factions.id),
  currentRegionId: text("current_region_id").references(() => regions.id),
  destinationRegionId: text("destination_region_id").references(() => regions.id),
  arrivesAt: timestamp("arrives_at", { withTimezone: true }),
  foodReserves: integer("food_reserves").notNull().default(0),
});

// --- Resource stocks -----------------------------------------------------

/**
 * Per-faction stockpile of each resource. Coin is *not* a resource here —
 * it's `factions.treasuryCoin`. Anything mod_spec.md §1.3 calls a `Resource`
 * (R:Bread, R:Mithril_Ingot, R:Wheat, etc.) lives here.
 */
export const resourceStocks = game.table(
  "resource_stocks",
  {
    factionId: text("faction_id")
      .notNull()
      .references(() => factions.id),
    resourceId: text("resource_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.factionId, t.resourceId] }),
  }),
);

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type District = typeof districts.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Army = typeof armies.$inferSelect;
export type ResourceStock = typeof resourceStocks.$inferSelect;
