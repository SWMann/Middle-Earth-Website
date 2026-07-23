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
  /**
   * The faction's architectural culture (config.cultures.id). Soft text
   * FK — no .references() — to avoid a config↔game import cycle, matching
   * the codebase idiom (districts.districtType, units.unitType, etc.).
   * Drives building variant names and the approved decoration palette.
   */
  cultureId: text("culture_id"),
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

// --- Plots (decoration scanner + build validator) ------------------------

/**
 * A plot is the block-space region of a player's district build. It is the
 * shared contract between two authoring paths (an in-game two-corner command,
 * and the web floorplanner) and the Andúril scanner that reads the world,
 * scores its decoration (0–100 vs config.decoration_criteria), validates the
 * district spec (required components + footprint), and gates it by settlement
 * tier. Written by the mod (and, in dev, the seed); the website reads it and
 * mutates via the bridge.
 *
 * Geometry: the axis-aligned bounding box is ALWAYS present (the scanner
 * iterates it). footprintCells optionally refines a non-rectangular plot.
 */
export const plots = game.table("plots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  // Linkage (both nullable: a plot may stand alone or tie to a district).
  settlementId: bigint("settlement_id", { mode: "number" }).references(
    () => settlements.id,
  ),
  districtId: bigint("district_id", { mode: "number" }).references(
    () => districts.id,
  ),
  /** The district type to validate against (config.district_types.id; soft FK). */
  districtType: text("district_type").notNull(),
  /** Resolves the culture for the theme_adherence criterion (soft FK). */
  factionId: text("faction_id"),
  /**
   * The world dimension this plot lives in (e.g. 'minecraft:overworld' or a
   * datapack dimension like 'middle-earth:middle_earth'). The mod reads the correct
   * world for HTTP scans + terrain renders instead of assuming the overworld.
   */
  dimension: text("dimension").notNull().default("minecraft:overworld"),
  source: text("source").notNull().default("command"), // 'command' | 'floorplanner'
  label: text("label").notNull().default(""),

  // --- Block-space geometry (the contract the scanner reads) ---
  minX: integer("min_x").notNull(),
  minY: integer("min_y").notNull(),
  minZ: integer("min_z").notNull(),
  maxX: integer("max_x").notNull(),
  maxY: integer("max_y").notNull(),
  maxZ: integer("max_z").notNull(),
  /** Optional refinement: the XZ block cells the plot actually occupies. */
  footprintCells: jsonb("footprint_cells").$type<[number, number][]>(),

  // --- Authoring (floorplanner; null for 'command' plots) ---
  transform: jsonb("transform").$type<Record<string, unknown>>(),
  underlayRef: text("underlay_ref"),
  /** Planned building footprints the validator compares the world against. */
  layout: jsonb("layout").$type<Record<string, unknown>>(),

  // --- Scan results (null until the first scan) ---
  decorationScore: integer("decoration_score"),
  criteriaBreakdown: jsonb("criteria_breakdown").$type<Record<string, number>>(),
  componentResult: jsonb("component_result").$type<Record<string, unknown>>(),
  footprintResult: jsonb("footprint_result").$type<Record<string, unknown>>(),
  /** unscanned|pending_spot|pending_full|auto_approved|approved|rejected */
  reviewStatus: text("review_status").notNull().default("unscanned"),
  reviewMode: text("review_mode"), // 'auto' | 'light' | 'spot' | 'full'
  reviewedBy: text("reviewed_by"), // admin discordId
  reviewNote: text("review_note").notNull().default(""),
  scannedAt: timestamp("scanned_at", { withTimezone: true }),
  scanAuditEventId: bigint("scan_audit_event_id", { mode: "number" }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Plot = typeof plots.$inferSelect;
export type NewPlot = typeof plots.$inferInsert;

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

// --- Diplomatic states ---------------------------------------------------

/**
 * Active diplomatic relationships between factions — wars, alliances,
 * trade deals, non-aggression pacts, truces, vassalages.
 *
 * Storage is single-row (not mirrored). For symmetric relationships
 * (war, alliance, non-aggression, truce, trade) queries that ask
 * "what's faction X involved in" check both factionAId and factionBId.
 * Asymmetric relationships (vassalage) treat factionAId as the
 * suzerain and factionBId as the vassal.
 *
 * Status lifecycle:
 *   active   → resolved (war ends, treaty signed) / broken (alliance
 *                broken unilaterally) / expired (timed deal ends naturally)
 *
 * Per mechanics_spec.md §8.2 the DP costs to enter each state vary
 * (war 800, trade 600, basic alliance 1200, military alliance 2200);
 * recorded in dpCost for traceability.
 */
export const diplomaticStates = game.table("diplomatic_states", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  /**
   * 'war' | 'alliance_basic' | 'alliance_military' | 'trade_deal' |
   * 'non_aggression' | 'truce' | 'vassalage' | 'joint_operation'
   */
  stateType: text("state_type").notNull(),
  factionAId: text("faction_a_id")
    .notNull()
    .references(() => factions.id),
  factionBId: text("faction_b_id")
    .notNull()
    .references(() => factions.id),
  /** 'active' | 'resolved' | 'broken' | 'expired' */
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  /** Nullable. Set for time-limited states (truce, council-decreed periods). */
  endsAt: timestamp("ends_at", { withTimezone: true }),
  /** When the state actually ended (war won, alliance broken, etc). */
  endedAt: timestamp("ended_at", { withTimezone: true }),
  /** Who declared / initiated. For symmetric relationships this is informational. */
  initiatedByFactionId: text("initiated_by_faction_id").references(() => factions.id),
  /** Free-text reason. Wars: casus belli. Alliances: pledge wording. */
  reason: text("reason").notNull().default(""),
  /** DP spent to enter this state (per mechanics_spec.md §8.2). */
  dpCost: integer("dp_cost").notNull().default(0),
  /**
   * How it ended: 'peace_treaty' | 'white_peace' | 'conquest' | 'breach' |
   * 'expiry' | 'mutual_dissolution'.
   */
  resolutionType: text("resolution_type"),
  /** The audit.events row that resolved this state (peace treaty event etc). */
  resolutionEventId: bigint("resolution_event_id", { mode: "number" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;
export type DiplomaticState = typeof diplomaticStates.$inferSelect;
export type NewDiplomaticState = typeof diplomaticStates.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
/**
 * Per-settlement breakdown of population by occupation class. The
 * settlements.population column remains the headline number; this table
 * tells you *who* makes it up. Sums of `count` for a settlement should
 * equal settlements.population — the daily tick is responsible for
 * keeping them aligned during growth, decline, and class shifts.
 */
export const settlementPopulation = game.table(
  "settlement_population",
  {
    settlementId: bigint("settlement_id", { mode: "number" })
      .notNull()
      .references(() => settlements.id),
    classId: text("class_id").notNull(),
    count: integer("count").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.settlementId, t.classId] }),
  }),
);

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type SettlementPopulation = typeof settlementPopulation.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type District = typeof districts.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Army = typeof armies.$inferSelect;
export type ResourceStock = typeof resourceStocks.$inferSelect;
