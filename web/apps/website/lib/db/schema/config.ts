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
  /** Faction restrictions, building requirements, bonuses — semi-structured. */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

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
  },
  (t) => ({
    pk: primaryKey({ columns: [t.districtTypeId, t.resourceId] }),
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
