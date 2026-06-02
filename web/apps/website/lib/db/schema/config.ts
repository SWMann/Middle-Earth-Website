/**
 * The `config.*` schema — catalogue tables defining what's POSSIBLE in
 * the world. Distinct from `game.*` which tracks what actually exists.
 *
 *   game.units    : "60 Citadel Guards garrisoned at Minas Tirith RIGHT NOW"
 *   config.unit_types : "Citadel Guard is a Gondor T:Elite unit costing
 *                        50 coin + 1 Numenorean_Fabric per recruit,
 *                        recruitment_time_days=5, health=28, armor=9..."
 *
 * Owned by admins (edited through the admin console at /admin/config),
 * read by both the website and the mod. The mod uses these tables to
 * validate recruitment, district construction, supply chain ticks, etc.
 *
 * Mod-spec reference: §3.4.
 */

import {
  pgSchema,
  text,
  integer,
  real,
  primaryKey,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";
import { factions } from "./game.ts";

export const config = pgSchema("config");

// --- Tags + Resources -----------------------------------------------------

/**
 * Tags categorise resources for flexible supply contracts. A Bakery
 * declaring `consumes: T:Grain weight≥1` accepts any resource that
 * satisfies T:Grain — Wheat (weight=2), Barley (weight=2), Cornbread-mix
 * (weight=1). Higher-weight inputs typically yield bonus production.
 */
export const tags = config.table("tags", {
  id: text("id").primaryKey(), // e.g. 'T:Grain'
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
});

export const resources = config.table("resources", {
  id: text("id").primaryKey(), // e.g. 'R:Wheat'
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
  /**
   * Food value per unit consumed. 0 for non-edible (Iron, Stone). Bread = 15.
   * Used by the daily tick when computing net food for population growth.
   */
  foodValue: integer("food_value").notNull().default(0),
});

/**
 * M:N between resources and tags, with the resource→tag weight. Each row
 * means "this resource satisfies this tag at this strength."
 */
export const resourceTags = config.table(
  "resource_tags",
  {
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
    weight: integer("weight").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.resourceId, t.tagId] }),
  }),
);

// --- District types -------------------------------------------------------

export const districtTypes = config.table("district_types", {
  id: text("id").primaryKey(), // 'cottage', 'wheat_farm', 'bakery', ...
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  /** Minimum settlement tier that can build this. */
  tierMin: text("tier_min").notNull(),
  popCost: integer("pop_cost").notNull().default(0),
  foodCost: integer("food_cost").notNull().default(0),
  /** For residential districts: how much population_cap this contributes. */
  populationCapProvided: integer("population_cap_provided").notNull().default(0),
  description: text("description").notNull().default(""),

  // --- Construction cost ---
  /** Coin paid to begin construction. */
  buildCoinCost: integer("build_coin_cost").notNull().default(0),
  /** DP cost — for diplomatic structures (Embassy, Waystone). */
  buildDpCost: integer("build_dp_cost").notNull().default(0),
  /** IRL days from order to active. 0 = instant. */
  buildTimeDays: integer("build_time_days").notNull().default(0),
  /** Daily coin to keep it running. Decays/deactivates if unpaid (mod logic). */
  upkeepCoinDaily: integer("upkeep_coin_daily").notNull().default(0),

  // --- Location constraints ---
  /** Allowed biomes. NULL = any. e.g. ['forest','plain'] for a Logging Camp. */
  requiredBiomes: text("required_biomes").array(),
  /** Region must have this discovery active. e.g. 'mithril' for a Mithril Mine. */
  requiresDiscovery: text("requires_discovery"),
  /** Terrain feature gate: 'coastal' | 'river' | 'mountain_peak' | NULL. */
  terrainRequirement: text("terrain_requirement"),

  // --- Limits ---
  /** Cap per settlement. NULL = unlimited. */
  maxPerSettlement: integer("max_per_settlement"),
  /** Uniqueness: 'settlement' | 'faction' | 'world' | NULL. */
  uniqueScope: text("unique_scope"),
  /** If set, every settlement at this tier MUST have one (Governance, Bird Messenger). */
  mandatoryAtTier: text("mandatory_at_tier"),

  // --- Progression ---
  /** Self-reference: this district is an upgrade of another (Cottage ← Hovel). */
  upgradesFrom: text("upgrades_from"),

  /** Catch-all for anything not worth a column (wall stats, building reqs, etc). */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

// --- District: build cost (materials) ------------------------------------

export const districtBuildCost = config.table(
  "district_build_cost",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    amount: integer("amount").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.resourceId] }),
  }),
);

// --- District: staffing by occupation class ------------------------------

/**
 * Class-specific staffing. A row here means "this district needs N of
 * this class to run." If a district has staffing rows, they REPLACE the
 * generic pop_cost for staffing purposes (pop_cost stays as the headline
 * number for back-compat / quick display). The mod, when implemented,
 * checks the settlement's settlement_population for the required classes.
 */
export const districtStaffing = config.table(
  "district_staffing",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    classId: text("class_id")
      .notNull()
      .references(() => occupationClasses.id),
    count: integer("count").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.classId] }),
  }),
);

// --- District: universal effects -----------------------------------------

/**
 * The extensibility workhorse. Each row is one effect a district has on
 * its settlement / faction / region. effect_type is an open enum; params
 * carries whatever that effect needs. The mod reads these and applies
 * them during the daily tick or when validating actions.
 *
 * Known effect types (grow this list freely, no migration needed):
 *   dp_per_day              params {amount}
 *   coin_per_day            params {amount}
 *   garrison_cap_bonus      params {amount, unit_filter?: 'cavalry'|...}
 *   unlocks_unit_category   params {category: 'T:Warrior'}
 *   recruit_time_modifier   params {days: -1}
 *   sight_range             params {blocks: 500}
 *   claim_block             params {}                (reserves the region)
 *   morale_modifier         params {amount: 10}
 *   growth_modifier         params {pct: 15}
 *   health_bonus            params {amount: 2}        (Healing House)
 *   trade_capacity          params {routes?: N, berths?: N}
 *   tax_modifier            params {pct: 10}
 */
export const districtEffects = config.table("district_effects", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  districtTypeId: text("district_type_id")
    .notNull()
    .references(() => districtTypes.id),
  effectType: text("effect_type").notNull(),
  params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
});

// --- District: biome-modified outputs ------------------------------------

/**
 * Overrides / adds to base production based on the region's biome.
 * A Logging Camp produces more Wood in forest than on plains; a Mine in
 * a mithril-bearing mountain produces Mithril. When a matching biome row
 * exists, it REPLACES the base district_produces for that resource line.
 */
export const districtBiomeOutputs = config.table(
  "district_biome_outputs",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    biome: text("biome").notNull(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    dailyAmount: integer("daily_amount").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.biome, t.resourceId] }),
  }),
);

// --- District: prerequisites ---------------------------------------------

export const districtPrerequisites = config.table(
  "district_prerequisites",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    prerequisiteDistrictTypeId: text("prerequisite_district_type_id")
      .notNull()
      .references(() => districtTypes.id),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.districtTypeId, t.prerequisiteDistrictTypeId],
    }),
  }),
);

// --- District: adjacency bonuses -----------------------------------------

/**
 * "If this district is near {adjacent} in the same settlement, apply
 * {bonus_type} of {bonus_value}." bonus_type is open:
 *   output_pct      +N% to this district's production
 *   upkeep_pct      −N% to upkeep
 *   build_time_pct  −N% to build time
 */
export const districtAdjacencyBonuses = config.table(
  "district_adjacency_bonuses",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    adjacentDistrictTypeId: text("adjacent_district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    bonusType: text("bonus_type").notNull(),
    bonusValue: integer("bonus_value").notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.districtTypeId, t.adjacentDistrictTypeId, t.bonusType],
    }),
  }),
);

// --- Faction district rules (restrict / unlock / override / modify) ------

/**
 * Per mod_spec.md §3.3. How a faction's access to a district differs from
 * the global default.
 *   rule_type='restrict'  faction CANNOT build this district. params {}
 *   rule_type='unlock'    faction-EXCLUSIVE district (others can't). params {}
 *   rule_type='override'  faction builds a different version. params {with: 'other_id'}
 *   rule_type='modify'    faction builds under different rules.
 *                         params {tier_min?: 'hamlet', pop_cost?: N, ...}
 */
export const factionDistrictRules = config.table(
  "faction_district_rules",
  {
    factionId: text("faction_id")
      .notNull()
      .references(() => factions.id),
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    ruleType: text("rule_type").notNull(),
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.factionId, t.districtTypeId, t.ruleType] }),
  }),
);

export const districtConsumes = config.table(
  "district_consumes",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
    weightMin: integer("weight_min").notNull().default(1),
    dailyAmount: integer("daily_amount").notNull(),
    /**
     * How often the input is consumed. 'daily' is the norm; 'weekly' /
     * 'monthly' model catalysts and tools (a mine's timber supports, a
     * forge's replacement dies) that are used up slowly rather than each
     * tick. The mod prorates the cost over the period.
     */
    consumptionPeriod: text("consumption_period").notNull().default("daily"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.tagId] }),
  }),
);

export const districtProduces = config.table(
  "district_produces",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    dailyAmount: integer("daily_amount").notNull(),
    /**
     * 'primary' = the district's main product. 'byproduct' = a secondary
     * output (Slag from a Smithy, Ash from a Charcoal Burner). Byproducts
     * are produced whenever the district runs but are usually low-value.
     */
    outputKind: text("output_kind").notNull().default("primary"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.resourceId] }),
  }),
);

// --- District: conditional production bonuses ----------------------------

/**
 * The spec's `bonuses_from`. Each row is "when {condition} holds, apply
 * {effect} to this district's production." Both sides are open jsonb so
 * the rule language grows without migrations.
 *
 * condition shapes (examples):
 *   { input_tag: 'T:Fuel', min_weight: 3 }   highest-grade fuel supplied
 *   { adjacent: 'wheat_farm' }                a partner district nearby
 *   { tier_min: 'city' }                      settlement is City or bigger
 *   { biome: 'forest' }                       on a forest tile
 * effect shapes:
 *   { output_resource: 'R:Steel', pct: 50 }   +50% to one product
 *   { output_all_pct: 25 }                    +25% to everything it makes
 */
export const districtProductionBonuses = config.table(
  "district_production_bonuses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    condition: jsonb("condition").$type<Record<string, unknown>>().notNull(),
    effect: jsonb("effect").$type<Record<string, unknown>>().notNull(),
    description: text("description").notNull().default(""),
  },
);

// --- District: alternate recipes (mode switching) ------------------------

/**
 * A district's BASE inputs/outputs live in district_consumes /
 * district_produces — that's the default mode. Rows here are ALTERNATE
 * modes the player can switch a specific instance to (stored in
 * game.districts.config_json.recipe). Each alternate has its own
 * recipe_consumes / recipe_produces.
 */
export const districtRecipes = config.table("district_recipes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  districtTypeId: text("district_type_id")
    .notNull()
    .references(() => districtTypes.id),
  recipeKey: text("recipe_key").notNull(), // 'charcoal_prep', 'refining'
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
});

export const recipeConsumes = config.table(
  "recipe_consumes",
  {
    recipeId: bigserial("recipe_id", { mode: "number" })
      .notNull()
      .references(() => districtRecipes.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
    weightMin: integer("weight_min").notNull().default(1),
    dailyAmount: integer("daily_amount").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.tagId] }),
  }),
);

export const recipeProduces = config.table(
  "recipe_produces",
  {
    recipeId: bigserial("recipe_id", { mode: "number" })
      .notNull()
      .references(() => districtRecipes.id),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    dailyAmount: integer("daily_amount").notNull(),
    outputKind: text("output_kind").notNull().default("primary"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.resourceId] }),
  }),
);

// --- District: tier-scaled output ----------------------------------------

/**
 * Production multiplier by the settlement's tier. A Wheat Farm in a City
 * out-produces one in a Village (better techniques, irrigation, mills).
 * multiplier_pct is applied to all of this district's outputs at that
 * tier. Absent tiers default to 100%.
 */
export const districtTierOutput = config.table(
  "district_tier_output",
  {
    districtTypeId: text("district_type_id")
      .notNull()
      .references(() => districtTypes.id),
    tier: text("tier").notNull(),
    multiplierPct: integer("multiplier_pct").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.tier] }),
  }),
);

// --- Unit types -----------------------------------------------------------

export const unitTypes = config.table("unit_types", {
  id: text("id").primaryKey(), // 'citadel_guard', 'rohirrim'
  displayName: text("display_name").notNull(),
  /** Null = standard unit available to multiple factions (re-skinned per faction). */
  factionId: text("faction_id").references(() => factions.id),
  /** Tag category: T:Warrior, T:Archer, T:Cavalry, T:Elite. */
  category: text("category").notNull(),
  /** Minimum settlement tier to recruit. */
  tierRequired: text("tier_required").notNull(),
  recruitmentTimeDays: integer("recruitment_time_days").notNull().default(1),
  popCost: integer("pop_cost").notNull().default(1),
  coinCost: integer("coin_cost").notNull(),
  upkeepFoodDaily: integer("upkeep_food_daily").notNull().default(0),
  upkeepCoinDaily: integer("upkeep_coin_daily").notNull().default(0),
  health: integer("health").notNull(),
  armor: integer("armor").notNull().default(0),
  morale: integer("morale").notNull().default(50),
  speed: real("speed").notNull().default(1.0),
  description: text("description").notNull().default(""),
  /** Attacks (weapon, damage, range) as JSON; bonuses, flagship flag. */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const unitRecruitmentCost = config.table(
  "unit_recruitment_cost",
  {
    unitTypeId: text("unit_type_id")
      .notNull()
      .references(() => unitTypes.id),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    amount: integer("amount").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.unitTypeId, t.resourceId] }),
  }),
);

// --- Occupation classes --------------------------------------------------

/**
 * Catalogue of population classes. Settlements track their composition
 * as counts per class (game.settlement_population). Classes carry
 * mechanical hints in metadata: military_potential (how readily
 * mobilisable as soldiers), tax_yield_per_capita (relative wealth),
 * food_cost_per_capita (some classes eat more), social_weight (council
 * influence). The mod reads these to compute taxation, conscription,
 * and food balance during the daily tick.
 */
export const occupationClasses = config.table("occupation_classes", {
  id: text("id").primaryKey(), // 'peasant', 'artisan', 'soldier', ...
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
  /** UI hint: a short single word like 'common', 'skilled', 'martial', 'elite'. */
  rank: text("rank").notNull().default("common"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export type Resource = typeof resources.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type DistrictType = typeof districtTypes.$inferSelect;
export type UnitType = typeof unitTypes.$inferSelect;
export type OccupationClass = typeof occupationClasses.$inferSelect;
export type DistrictEffect = typeof districtEffects.$inferSelect;
export type FactionDistrictRule = typeof factionDistrictRules.$inferSelect;
