/**
 * Vertical-slice catalogue seed for the config.* tables.
 *
 * Demonstrates the full district-customisation surface: tag-weighted
 * supply chains, build costs (coin + materials + time), class-specific
 * staffing, universal effects, biome requirements + biome-modified
 * outputs, discovery gating, prerequisites, upgrade chains, adjacency
 * bonuses, and per-faction rules (restrict / unlock / override / modify).
 */

// --- Tags -----------------------------------------------------------------

export const tagsCatalogue = [
  { id: "T:Grain", displayName: "Grain", description: "Cereals and breadstuff inputs." },
  { id: "T:Fuel", displayName: "Fuel", description: "Burnable for heat or process input." },
  { id: "T:Building", displayName: "Building Material", description: "Structural material for construction." },
  { id: "T:Mineral", displayName: "Mineral", description: "Extracted from mines or quarries." },
  { id: "T:Metal_Ore", displayName: "Metal Ore", description: "Smeltable into ingots." },
  { id: "T:Metal", displayName: "Metal", description: "Refined metals suitable for forging." },
  { id: "T:Hide", displayName: "Hide", description: "Skins and leathers." },
  { id: "T:Cloth", displayName: "Cloth", description: "Woven materials." },
  { id: "T:Food", displayName: "Food", description: "Edibles. Provides food_value when consumed." },
];

// --- Resources -----------------------------------------------------------

export const resourcesCatalogue = [
  { id: "R:Wheat", displayName: "Wheat", description: "Staple grain of Eriador and the Riddermark.", foodValue: 0 },
  { id: "R:Wood", displayName: "Wood", description: "Felled timber. Versatile.", foodValue: 0 },
  { id: "R:Coal", displayName: "Coal", description: "Burning rock. Best fuel for smelting.", foodValue: 0 },
  { id: "R:Stone", displayName: "Stone", description: "Quarried block. Foundational.", foodValue: 0 },
  { id: "R:Iron_Ore", displayName: "Iron Ore", description: "Raw ore from mines. Smelt to ingots.", foodValue: 0 },
  { id: "R:Iron_Ingot", displayName: "Iron Ingot", description: "Smelted iron. The smith's stock.", foodValue: 0 },
  { id: "R:Steel", displayName: "Steel", description: "Forged from iron with hot fuel. Armour-grade.", foodValue: 0 },
  { id: "R:Leather", displayName: "Leather", description: "Tanned hide. For armour and gear.", foodValue: 0 },
  { id: "R:Wool", displayName: "Wool", description: "Sheared sheep. Cloth, padding, and insulation.", foodValue: 0 },
  { id: "R:Bread", displayName: "Bread", description: "Baked staple. Feeds the smallfolk.", foodValue: 15 },
  { id: "R:Charcoal", displayName: "Charcoal", description: "Wood slow-burned to clean fuel. A charcoal-burner's craft.", foodValue: 0 },
  { id: "R:Mithril_Ore", displayName: "Mithril Ore", description: "True-silver. Found only where the deep mountains permit. Priceless.", foodValue: 0 },
  { id: "R:Mallorn", displayName: "Mallorn Timber", description: "Silver-barked, gold-leafed wood of Lothlórien. Stronger than oak, lighter than ash.", foodValue: 0 },
  { id: "R:Slag", displayName: "Slag", description: "Glassy waste from smelting. Worthless to a smith, but cheap rubble-fill for foundations.", foodValue: 0 },
];

// --- Resource → Tag weights ----------------------------------------------

export const resourceTagMappings = [
  { resourceId: "R:Wheat", tagId: "T:Grain", weight: 2 },
  { resourceId: "R:Wood", tagId: "T:Fuel", weight: 1 },
  { resourceId: "R:Wood", tagId: "T:Building", weight: 2 },
  { resourceId: "R:Coal", tagId: "T:Fuel", weight: 3 },
  { resourceId: "R:Coal", tagId: "T:Mineral", weight: 2 },
  { resourceId: "R:Stone", tagId: "T:Building", weight: 3 },
  { resourceId: "R:Stone", tagId: "T:Mineral", weight: 2 },
  { resourceId: "R:Iron_Ore", tagId: "T:Mineral", weight: 1 },
  { resourceId: "R:Iron_Ore", tagId: "T:Metal_Ore", weight: 2 },
  { resourceId: "R:Iron_Ingot", tagId: "T:Metal", weight: 2 },
  { resourceId: "R:Steel", tagId: "T:Metal", weight: 3 },
  { resourceId: "R:Leather", tagId: "T:Hide", weight: 2 },
  { resourceId: "R:Wool", tagId: "T:Cloth", weight: 2 },
  { resourceId: "R:Bread", tagId: "T:Food", weight: 2 },
  { resourceId: "R:Charcoal", tagId: "T:Fuel", weight: 2 },
  { resourceId: "R:Mithril_Ore", tagId: "T:Metal_Ore", weight: 3 },
  { resourceId: "R:Mithril_Ore", tagId: "T:Mineral", weight: 3 },
  { resourceId: "R:Mallorn", tagId: "T:Building", weight: 4 },
  { resourceId: "R:Mallorn", tagId: "T:Fuel", weight: 1 },
  { resourceId: "R:Slag", tagId: "T:Building", weight: 1 },
];

// --- District types -------------------------------------------------------
//
// Shape per entry (most fields optional; the seed loop fills defaults):
//   id, displayName, category, tierMin, popCost?, populationCapProvided?,
//   description, buildCoinCost?, buildDpCost?, buildTimeDays?,
//   upkeepCoinDaily?, requiredBiomes?, requiresDiscovery?,
//   terrainRequirement?, maxPerSettlement?, uniqueScope?, mandatoryAtTier?,
//   upgradesFrom?, metadata?

export type DistrictSeed = {
  id: string;
  displayName: string;
  category: string;
  tierMin: string;
  popCost?: number;
  populationCapProvided?: number;
  description: string;
  buildCoinCost?: number;
  buildDpCost?: number;
  buildTimeDays?: number;
  upkeepCoinDaily?: number;
  requiredBiomes?: string[];
  requiresDiscovery?: string;
  terrainRequirement?: string;
  maxPerSettlement?: number;
  uniqueScope?: string;
  mandatoryAtTier?: string;
  upgradesFrom?: string;
  metadata?: Record<string, unknown>;
};

export const districtTypesCatalogue: DistrictSeed[] = [
  // ----- Residential (upgrade chain hovel → cottage → house → manor) -----
  {
    id: "hovel", displayName: "Hovel", category: "residential", tierMin: "hamlet",
    populationCapProvided: 1, buildCoinCost: 0, buildTimeDays: 0,
    description: "A turf-and-wattle one-room dwelling. The smallest legitimate housing — single family, no amenities.",
  },
  {
    id: "cottage", displayName: "Cottage", category: "residential", tierMin: "village",
    populationCapProvided: 3, upgradesFrom: "hovel", buildCoinCost: 20, buildTimeDays: 1,
    description: "A small timber-framed home with a hearth. Extended family or two small ones.",
  },
  {
    id: "house", displayName: "House", category: "residential", tierMin: "burgh",
    populationCapProvided: 7, upgradesFrom: "cottage", buildCoinCost: 60, buildTimeDays: 2,
    description: "A proper two-storey home with outbuildings. The mark of a settled burgher.",
  },
  {
    id: "manor", displayName: "Manor", category: "residential", tierMin: "town",
    populationCapProvided: 10, upgradesFrom: "house", buildCoinCost: 150, buildTimeDays: 3, upkeepCoinDaily: 1,
    description: "A walled estate with servants' quarters and a hall. Houses the well-to-do.",
  },

  // ----- Agricultural -----
  {
    id: "wheat_farm", displayName: "Wheat Farm", category: "agricultural", tierMin: "village",
    popCost: 4, requiredBiomes: ["plain"], buildCoinCost: 30, buildTimeDays: 2,
    description: "Fields of grain worked by farm hands. Foundation of any larger settlement's food supply. Needs open plains.",
  },

  // ----- Extraction -----
  {
    id: "logging_camp", displayName: "Logging Camp", category: "extraction", tierMin: "village",
    popCost: 2, requiredBiomes: ["forest", "plain"], buildCoinCost: 25, buildTimeDays: 1,
    description: "Felled timber from wooded land. Output depends sharply on how thickly the tile is forested.",
  },
  {
    id: "stone_quarry", displayName: "Stone Quarry", category: "extraction", tierMin: "burgh",
    popCost: 3, requiredBiomes: ["mountain"], buildCoinCost: 60, buildTimeDays: 3,
    description: "Open-face cut stone. Heavy work; needs rocky or mountain ground.",
  },
  {
    id: "iron_mine", displayName: "Iron Mine", category: "extraction", tierMin: "burgh",
    popCost: 3, requiredBiomes: ["mountain"], buildCoinCost: 80, buildTimeDays: 3,
    description: "Pit and shaft mining for iron ore. Consumes fuel to keep tools and lamps running.",
  },
  {
    id: "mithril_mine", displayName: "Mithril Mine", category: "extraction", tierMin: "city",
    popCost: 4, requiredBiomes: ["mountain"], requiresDiscovery: "mithril",
    buildCoinCost: 500, buildTimeDays: 7, upkeepCoinDaily: 5,
    description: "Deep-shaft working for true-silver. Only buildable where a Prospector has confirmed a mithril vein — and even then, the digging is perilous and slow.",
  },
  {
    id: "mallorn_grove", displayName: "Mallorn Grove", category: "extraction", tierMin: "town",
    popCost: 2, requiredBiomes: ["forest"], buildCoinCost: 100, buildTimeDays: 5,
    description: "A tended stand of mallorn. Harvested with reverence, never clear-cut. Only the Galadhrim know the way of it.",
  },

  // ----- Industrial -----
  {
    id: "bakery", displayName: "Bakery", category: "industrial", tierMin: "village",
    popCost: 2, buildCoinCost: 50, buildTimeDays: 2,
    description: "Hearth-baked bread from grain. Settlement's daily food anchor. Works far better beside a farm.",
  },
  {
    id: "charcoal_burner", displayName: "Charcoal Burner", category: "industrial", tierMin: "village",
    popCost: 1, buildCoinCost: 20, buildTimeDays: 1,
    description: "Smoulders raw timber into clean-burning charcoal. The smith's friend; the forester's enemy.",
  },
  {
    id: "smithy", displayName: "Smithy", category: "industrial", tierMin: "burgh",
    popCost: 2, buildCoinCost: 100, buildTimeDays: 3,
    description: "Smelts ore into ingots. Higher-weight fuel yields cleaner metal.",
  },
  {
    id: "foundry", displayName: "Foundry", category: "industrial", tierMin: "town",
    popCost: 4, buildCoinCost: 250, buildTimeDays: 5, upkeepCoinDaily: 2,
    description: "Steel from iron under sustained heat. Requires high-grade fuel and an existing smithy's expertise.",
  },

  // ----- Trade -----
  {
    id: "market", displayName: "Market", category: "trade", tierMin: "village",
    popCost: 1, buildCoinCost: 40, buildTimeDays: 2, maxPerSettlement: 1,
    description: "Stalls and a weigh-house. Turns the settlement's traffic into coin.",
  },
  {
    id: "harbour", displayName: "Harbour", category: "trade", tierMin: "village",
    popCost: 2, terrainRequirement: "coastal", buildCoinCost: 80, buildTimeDays: 3,
    description: "Quays, a breakwater, and berths. The seat of sea trade and naval power — coastal tiles only.",
  },

  // ----- Luxury (DP) -----
  {
    id: "library", displayName: "Library", category: "luxury", tierMin: "town",
    popCost: 2, buildCoinCost: 200, buildTimeDays: 4, upkeepCoinDaily: 1, maxPerSettlement: 1,
    description: "Scriptorium and archive. Scholars here generate the diplomatic capital that moves the world.",
  },
  {
    id: "embassy", displayName: "Embassy", category: "luxury", tierMin: "burgh",
    popCost: 1, buildDpCost: 75, buildCoinCost: 50, buildTimeDays: 2,
    description: "A formal mission to another power. Costs Diplomacy Points to raise, and earns them back in steady trickle.",
  },

  // ----- Military -----
  {
    id: "barracks", displayName: "Barracks", category: "military", tierMin: "burgh",
    popCost: 3, buildCoinCost: 120, buildTimeDays: 3,
    description: "Quarters and a drill-yard. Raises the settlement's garrison ceiling and lets it train footsoldiers.",
  },
  {
    id: "stables", displayName: "Stables", category: "military", tierMin: "burgh",
    popCost: 2, buildCoinCost: 100, buildTimeDays: 3,
    description: "Horse-lines, a paddock, a farrier. Quarters cavalry and lets the settlement raise riders.",
  },
  {
    id: "uruk_pit", displayName: "Uruk Pit", category: "military", tierMin: "burgh",
    popCost: 2, buildCoinCost: 80, buildTimeDays: 2,
    description: "Breeding-vats and slave-pens sunk into the earth. Churns out fighters who fear neither sun nor death. The work of the Dark powers alone.",
  },
  {
    id: "swan_knight_hall", displayName: "Swan Knight Hall", category: "military", tierMin: "city",
    popCost: 2, buildCoinCost: 200, buildTimeDays: 4,
    description: "The training hall of the Knights of Dol Amroth. Where the finest cavalry of Gondor are made.",
  },

  // ----- Governance -----
  {
    id: "great_hall", displayName: "Great Hall", category: "governance", tierMin: "village",
    popCost: 3, buildCoinCost: 80, buildTimeDays: 2, maxPerSettlement: 1, mandatoryAtTier: "village",
    description: "Seat of the settlement's authority. Where law is spoken and tax is gathered. Every village and larger must have one.",
  },
  {
    id: "bird_messenger", displayName: "Bird Messenger", category: "governance", tierMin: "burgh",
    buildCoinCost: 30, buildTimeDays: 1, maxPerSettlement: 1, mandatoryAtTier: "burgh",
    description: "A loft of trained messenger-birds. Required infrastructure for any chartered market town to stay in contact.",
  },
  {
    id: "healing_house", displayName: "Healing House", category: "governance", tierMin: "town",
    popCost: 1, buildCoinCost: 150, buildTimeDays: 3,
    description: "Houses of healing staffed by those versed in herb-lore. Reduces wound scores and fends off plague.",
  },

  // ----- Social -----
  {
    id: "tavern", displayName: "Tavern", category: "trade", tierMin: "village",
    popCost: 1, buildCoinCost: 40, buildTimeDays: 2,
    description: "Ale, hearth, and gossip. Keeps the smallfolk content and loosens tongues for those who listen.",
  },

  // ----- Intelligence -----
  {
    id: "watchtower", displayName: "Watchtower", category: "defensive", tierMin: "village",
    popCost: 1, buildCoinCost: 60, buildTimeDays: 2, maxPerSettlement: 2,
    description: "A tall stone tower with a beacon. Reveals movement for leagues around and reserves an unclaimed region from rival hands.",
  },

  // ----- Defensive (walls) — mechanics_spec.md §5.5 -----
  {
    id: "basic_palisade", displayName: "Basic Palisade", category: "defensive", tierMin: "village",
    buildCoinCost: 40, buildTimeDays: 1,
    description: "Sharpened logs driven into an earthen bank. Slows a charge, breaks under fire.",
    metadata: { defense_bonus_pct: 10, delay_of_engagement_hours: 24, breach_difficulty: "easy", breach_requires: ["any_ram", "fire"] },
  },
  {
    id: "advanced_palisade", displayName: "Advanced Palisade", category: "defensive", tierMin: "burgh",
    buildCoinCost: 80, buildTimeDays: 2,
    description: "Doubled timber with a fighting platform. Buys real time but still wood.",
    metadata: { defense_bonus_pct: 20, delay_of_engagement_hours: 48, breach_difficulty: "easy", breach_requires: ["ram", "tower"] },
  },
  {
    id: "basic_stone_wall", displayName: "Basic Stone Wall", category: "defensive", tierMin: "town",
    buildCoinCost: 200, buildTimeDays: 4,
    description: "Mortared stone, half a man-height thick. Archer cover; rams must work for it.",
    metadata: { defense_bonus_pct: 30, delay_of_engagement_hours: 72, breach_difficulty: "moderate", breach_requires: ["heavy_ram", "sustained_siege"], archer_cover: true },
  },
  {
    id: "advanced_stone_wall", displayName: "Advanced Stone Wall", category: "defensive", tierMin: "city",
    buildCoinCost: 500, buildTimeDays: 6,
    description: "Crenellated walls with archer towers and a sally port. The standard of cities.",
    metadata: { defense_bonus_pct: 40, delay_of_engagement_hours: 120, breach_difficulty: "hard", breach_requires: ["heavy_ram", "breach_charges"], archer_cover: true, ranged_retaliation: true },
  },
  {
    id: "citadel_walls", displayName: "Citadel Walls", category: "defensive", tierMin: "great_city",
    buildCoinCost: 1500, buildTimeDays: 10,
    description: "Layered defences with inner keeps. A second wave of defenders forms behind the first.",
    metadata: { defense_bonus_pct: 50, delay_of_engagement_hours: 168, breach_difficulty: "very_hard", breach_requires: ["multiple_siege_engines", "days_of_effort"], archer_cover: true, ranged_retaliation: true, defender_waves: 1 },
  },
  {
    id: "capital_walls", displayName: "Capital Walls", category: "defensive", tierMin: "capital",
    buildCoinCost: 3000, buildTimeDays: 14, upkeepCoinDaily: 5,
    description: "The work of an age. Anorien-grade masonry, mithril-bound gates, two reserve garrisons. Only capitals.",
    metadata: { defense_bonus_pct: 60, delay_of_engagement_hours: 240, breach_difficulty: "extreme", breach_requires: ["specialised_siege_engineering"], archer_cover: true, ranged_retaliation: true, defender_waves: 2 },
  },
];

// --- District build costs (materials) ------------------------------------

export const districtBuildCostCatalogue = [
  { districtTypeId: "cottage", resourceId: "R:Wood", amount: 5 },
  { districtTypeId: "house", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "house", resourceId: "R:Stone", amount: 5 },
  { districtTypeId: "manor", resourceId: "R:Wood", amount: 15 },
  { districtTypeId: "manor", resourceId: "R:Stone", amount: 15 },
  { districtTypeId: "wheat_farm", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "logging_camp", resourceId: "R:Wood", amount: 5 },
  { districtTypeId: "stone_quarry", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "iron_mine", resourceId: "R:Wood", amount: 15 },
  { districtTypeId: "iron_mine", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "mithril_mine", resourceId: "R:Stone", amount: 50 },
  { districtTypeId: "mithril_mine", resourceId: "R:Steel", amount: 20 },
  { districtTypeId: "mallorn_grove", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "bakery", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "bakery", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "charcoal_burner", resourceId: "R:Wood", amount: 5 },
  { districtTypeId: "smithy", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "smithy", resourceId: "R:Iron_Ingot", amount: 10 },
  { districtTypeId: "foundry", resourceId: "R:Stone", amount: 40 },
  { districtTypeId: "foundry", resourceId: "R:Iron_Ingot", amount: 20 },
  { districtTypeId: "market", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "harbour", resourceId: "R:Wood", amount: 20 },
  { districtTypeId: "harbour", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "library", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "library", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "embassy", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "barracks", resourceId: "R:Wood", amount: 30 },
  { districtTypeId: "barracks", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "stables", resourceId: "R:Wood", amount: 20 },
  { districtTypeId: "uruk_pit", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "swan_knight_hall", resourceId: "R:Stone", amount: 30 },
  { districtTypeId: "swan_knight_hall", resourceId: "R:Steel", amount: 10 },
  { districtTypeId: "great_hall", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "bird_messenger", resourceId: "R:Wood", amount: 5 },
  { districtTypeId: "healing_house", resourceId: "R:Stone", amount: 20 },
  { districtTypeId: "tavern", resourceId: "R:Wood", amount: 10 },
  { districtTypeId: "watchtower", resourceId: "R:Wood", amount: 15 },
  { districtTypeId: "watchtower", resourceId: "R:Stone", amount: 10 },
  { districtTypeId: "basic_palisade", resourceId: "R:Wood", amount: 20 },
  { districtTypeId: "advanced_palisade", resourceId: "R:Wood", amount: 40 },
  { districtTypeId: "basic_stone_wall", resourceId: "R:Stone", amount: 60 },
  { districtTypeId: "advanced_stone_wall", resourceId: "R:Stone", amount: 150 },
  { districtTypeId: "advanced_stone_wall", resourceId: "R:Iron_Ingot", amount: 20 },
  { districtTypeId: "citadel_walls", resourceId: "R:Stone", amount: 400 },
  { districtTypeId: "citadel_walls", resourceId: "R:Steel", amount: 50 },
  { districtTypeId: "capital_walls", resourceId: "R:Stone", amount: 800 },
  { districtTypeId: "capital_walls", resourceId: "R:Steel", amount: 100 },
];

// --- District staffing (by occupation class) -----------------------------

export const districtStaffingCatalogue = [
  { districtTypeId: "wheat_farm", classId: "peasant", count: 4 },
  { districtTypeId: "logging_camp", classId: "peasant", count: 2 },
  { districtTypeId: "stone_quarry", classId: "peasant", count: 3 },
  { districtTypeId: "iron_mine", classId: "peasant", count: 3 },
  { districtTypeId: "mithril_mine", classId: "peasant", count: 4 },
  { districtTypeId: "mallorn_grove", classId: "scholar", count: 1 },
  { districtTypeId: "mallorn_grove", classId: "peasant", count: 1 },
  { districtTypeId: "bakery", classId: "artisan", count: 1 },
  { districtTypeId: "bakery", classId: "peasant", count: 1 },
  { districtTypeId: "charcoal_burner", classId: "peasant", count: 1 },
  { districtTypeId: "smithy", classId: "artisan", count: 2 },
  { districtTypeId: "foundry", classId: "artisan", count: 3 },
  { districtTypeId: "foundry", classId: "peasant", count: 1 },
  { districtTypeId: "market", classId: "merchant", count: 1 },
  { districtTypeId: "harbour", classId: "merchant", count: 2 },
  { districtTypeId: "library", classId: "scholar", count: 2 },
  { districtTypeId: "embassy", classId: "noble", count: 1 },
  { districtTypeId: "embassy", classId: "scholar", count: 1 },
  { districtTypeId: "barracks", classId: "soldier", count: 2 },
  { districtTypeId: "barracks", classId: "peasant", count: 1 },
  { districtTypeId: "stables", classId: "soldier", count: 1 },
  { districtTypeId: "stables", classId: "peasant", count: 1 },
  { districtTypeId: "uruk_pit", classId: "soldier", count: 2 },
  { districtTypeId: "swan_knight_hall", classId: "soldier", count: 1 },
  { districtTypeId: "swan_knight_hall", classId: "noble", count: 1 },
  { districtTypeId: "great_hall", classId: "noble", count: 1 },
  { districtTypeId: "great_hall", classId: "peasant", count: 2 },
  { districtTypeId: "healing_house", classId: "scholar", count: 1 },
  { districtTypeId: "watchtower", classId: "soldier", count: 1 },
  { districtTypeId: "tavern", classId: "peasant", count: 1 },
];

// --- District effects (universal) ----------------------------------------

export const districtEffectsCatalogue = [
  { districtTypeId: "market", effectType: "coin_per_day", params: { amount: 10 } },
  { districtTypeId: "harbour", effectType: "coin_per_day", params: { amount: 5 } },
  { districtTypeId: "harbour", effectType: "trade_capacity", params: { berths: 4 } },
  { districtTypeId: "library", effectType: "dp_per_day", params: { amount: 5 } },
  { districtTypeId: "embassy", effectType: "dp_per_day", params: { amount: 3 } },
  { districtTypeId: "barracks", effectType: "garrison_cap_bonus", params: { amount: 20 } },
  { districtTypeId: "barracks", effectType: "unlocks_unit_category", params: { category: "T:Warrior" } },
  { districtTypeId: "stables", effectType: "garrison_cap_bonus", params: { amount: 10, unit_filter: "cavalry" } },
  { districtTypeId: "stables", effectType: "unlocks_unit_category", params: { category: "T:Cavalry" } },
  { districtTypeId: "uruk_pit", effectType: "garrison_cap_bonus", params: { amount: 15 } },
  { districtTypeId: "uruk_pit", effectType: "unlocks_unit_category", params: { category: "T:Warrior" } },
  { districtTypeId: "swan_knight_hall", effectType: "garrison_cap_bonus", params: { amount: 15, unit_filter: "cavalry" } },
  { districtTypeId: "swan_knight_hall", effectType: "unlocks_unit_category", params: { category: "T:Elite" } },
  { districtTypeId: "great_hall", effectType: "tax_modifier", params: { pct: 10 } },
  { districtTypeId: "healing_house", effectType: "health_bonus", params: { amount: 2 } },
  { districtTypeId: "healing_house", effectType: "growth_modifier", params: { pct: 5 } },
  { districtTypeId: "tavern", effectType: "morale_modifier", params: { amount: 10 } },
  { districtTypeId: "watchtower", effectType: "sight_range", params: { blocks: 500 } },
  { districtTypeId: "watchtower", effectType: "claim_block", params: {} },
  { districtTypeId: "bird_messenger", effectType: "dp_per_day", params: { amount: 1 } },
];

// --- District biome-modified outputs -------------------------------------
// Same district, different yield (or different resource) by tile biome.

export const districtBiomeOutputsCatalogue = [
  { districtTypeId: "logging_camp", biome: "forest", resourceId: "R:Wood", dailyAmount: 4 },
  { districtTypeId: "logging_camp", biome: "plain", resourceId: "R:Wood", dailyAmount: 1 },
  { districtTypeId: "stone_quarry", biome: "mountain", resourceId: "R:Stone", dailyAmount: 3 },
  { districtTypeId: "iron_mine", biome: "mountain", resourceId: "R:Iron_Ore", dailyAmount: 2 },
  { districtTypeId: "mithril_mine", biome: "mountain", resourceId: "R:Mithril_Ore", dailyAmount: 1 },
  { districtTypeId: "mallorn_grove", biome: "forest", resourceId: "R:Mallorn", dailyAmount: 1 },
];

// --- District prerequisites ----------------------------------------------

export const districtPrerequisitesCatalogue = [
  { districtTypeId: "foundry", prerequisiteDistrictTypeId: "smithy" },
  { districtTypeId: "mithril_mine", prerequisiteDistrictTypeId: "iron_mine" },
];

// --- District adjacency bonuses ------------------------------------------

export const districtAdjacencyBonusesCatalogue = [
  { districtTypeId: "bakery", adjacentDistrictTypeId: "wheat_farm", bonusType: "output_pct", bonusValue: 20 },
  { districtTypeId: "smithy", adjacentDistrictTypeId: "iron_mine", bonusType: "output_pct", bonusValue: 15 },
  { districtTypeId: "foundry", adjacentDistrictTypeId: "smithy", bonusType: "output_pct", bonusValue: 10 },
  { districtTypeId: "charcoal_burner", adjacentDistrictTypeId: "logging_camp", bonusType: "output_pct", bonusValue: 25 },
  { districtTypeId: "market", adjacentDistrictTypeId: "harbour", bonusType: "output_pct", bonusValue: 20 },
];

// --- Faction district rules (restrict / unlock / override / modify) ------

export const factionDistrictRulesCatalogue = [
  // Shire: hobbits don't do heavy industry or war-breeding.
  { factionId: "shire", districtTypeId: "iron_mine", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "foundry", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "charcoal_burner", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "uruk_pit", ruleType: "restrict", params: {} },
  // Shire: but they farm from the very start — wheat farms at hamlet tier.
  { factionId: "shire", districtTypeId: "wheat_farm", ruleType: "modify", params: { tier_min: "hamlet" } },

  // Uruk Pit: only the Dark powers may breed them.
  { factionId: "mordor", districtTypeId: "uruk_pit", ruleType: "unlock", params: {} },
  { factionId: "isengard", districtTypeId: "uruk_pit", ruleType: "unlock", params: {} },

  // Mallorn Grove: Lothlórien alone keeps the way of it.
  { factionId: "lothlorien", districtTypeId: "mallorn_grove", ruleType: "unlock", params: {} },

  // Swan Knight Hall: Dol Amroth's exclusively. And for them, it REPLACES
  // the ordinary barracks — their footsoldiers train as knights.
  { factionId: "dol_amroth", districtTypeId: "swan_knight_hall", ruleType: "unlock", params: {} },
  { factionId: "dol_amroth", districtTypeId: "barracks", ruleType: "override", params: { with: "swan_knight_hall" } },
];

// --- District consumes (tag-based) ---------------------------------------

export const districtConsumesCatalogue = [
  { districtTypeId: "iron_mine", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "mithril_mine", tagId: "T:Fuel", weightMin: 2, dailyAmount: 2 },
  // Catalyst: the deep shafts must be re-shored with steel — a monthly,
  // not daily, draw. consumptionPeriod marks it as a slow-burn input.
  { districtTypeId: "mithril_mine", tagId: "T:Metal", weightMin: 3, dailyAmount: 1, consumptionPeriod: "monthly" },
  { districtTypeId: "bakery", tagId: "T:Grain", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "bakery", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "charcoal_burner", tagId: "T:Building", weightMin: 1, dailyAmount: 2 },
  { districtTypeId: "smithy", tagId: "T:Metal_Ore", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "smithy", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "foundry", tagId: "T:Metal", weightMin: 2, dailyAmount: 1 },
  { districtTypeId: "foundry", tagId: "T:Fuel", weightMin: 2, dailyAmount: 2 },
];

// --- District produces (base, resource-based) ----------------------------
// Biome outputs above override these per-tile where they match.

export const districtProducesCatalogue = [
  { districtTypeId: "wheat_farm", resourceId: "R:Wheat", dailyAmount: 4 },
  { districtTypeId: "logging_camp", resourceId: "R:Wood", dailyAmount: 3 },
  { districtTypeId: "stone_quarry", resourceId: "R:Stone", dailyAmount: 3 },
  { districtTypeId: "iron_mine", resourceId: "R:Iron_Ore", dailyAmount: 2 },
  { districtTypeId: "mithril_mine", resourceId: "R:Mithril_Ore", dailyAmount: 1 },
  { districtTypeId: "mallorn_grove", resourceId: "R:Mallorn", dailyAmount: 1 },
  { districtTypeId: "bakery", resourceId: "R:Bread", dailyAmount: 8 },
  { districtTypeId: "charcoal_burner", resourceId: "R:Charcoal", dailyAmount: 2 },
  { districtTypeId: "smithy", resourceId: "R:Iron_Ingot", dailyAmount: 1 },
  // Byproduct: every smelt leaves slag. Low value, but not nothing.
  { districtTypeId: "smithy", resourceId: "R:Slag", dailyAmount: 1, outputKind: "byproduct" },
  { districtTypeId: "foundry", resourceId: "R:Steel", dailyAmount: 1 },
];

// --- Conditional production bonuses (the spec's bonuses_from) -------------

export const districtProductionBonusesCatalogue = [
  {
    districtTypeId: "foundry",
    condition: { input_tag: "T:Fuel", min_weight: 3 },
    effect: { output_resource: "R:Steel", pct: 50 },
    description: "Fed with coal — the hottest fuel — the foundry yields half again as much steel.",
  },
  {
    districtTypeId: "smithy",
    condition: { input_tag: "T:Fuel", min_weight: 2 },
    effect: { output_all_pct: 20 },
    description: "Charcoal or better burns cleaner than raw wood: +20% to all output.",
  },
  {
    districtTypeId: "bakery",
    condition: { input_tag: "T:Grain", min_weight: 3 },
    effect: { output_resource: "R:Bread", pct: 50 },
    description: "Premium grain (weight 3+) lifts bread output by half. (No such grain exists in the catalogue yet — the rule waits for one.)",
  },
  {
    districtTypeId: "wheat_farm",
    condition: { tier_min: "city" },
    effect: { output_all_pct: 40 },
    description: "City-scale irrigation, crop rotation, and mills lift yields sharply.",
  },
];

// --- Alternate recipes (mode switching) ----------------------------------
// The base district_consumes/produces are the DEFAULT mode. These are
// alternates a player can switch a specific instance to.

export const districtRecipesCatalogue = [
  {
    districtTypeId: "logging_camp",
    recipeKey: "charcoal_prep",
    displayName: "Charcoal Preparation",
    description: "Burn part of the cut on site. Less timber out the gate, but charcoal alongside it.",
    consumes: [] as { tagId: string; weightMin: number; dailyAmount: number }[],
    produces: [
      { resourceId: "R:Wood", dailyAmount: 1, outputKind: "primary" },
      { resourceId: "R:Charcoal", dailyAmount: 1, outputKind: "primary" },
    ],
  },
  {
    districtTypeId: "smithy",
    recipeKey: "refining",
    displayName: "High-Throughput Refining",
    description: "Run the forge hot and hard — double the ore and fuel for double the ingots. No slag savings.",
    consumes: [
      { tagId: "T:Metal_Ore", weightMin: 1, dailyAmount: 2 },
      { tagId: "T:Fuel", weightMin: 1, dailyAmount: 2 },
    ],
    produces: [
      { resourceId: "R:Iron_Ingot", dailyAmount: 2, outputKind: "primary" },
      { resourceId: "R:Slag", dailyAmount: 2, outputKind: "byproduct" },
    ],
  },
];

// --- Tier-scaled output --------------------------------------------------

export const districtTierOutputCatalogue = [
  { districtTypeId: "wheat_farm", tier: "town", multiplierPct: 120 },
  { districtTypeId: "wheat_farm", tier: "city", multiplierPct: 140 },
  { districtTypeId: "wheat_farm", tier: "great_city", multiplierPct: 160 },
  { districtTypeId: "wheat_farm", tier: "capital", multiplierPct: 180 },
  { districtTypeId: "bakery", tier: "city", multiplierPct: 130 },
  { districtTypeId: "bakery", tier: "capital", multiplierPct: 150 },
  { districtTypeId: "smithy", tier: "city", multiplierPct: 125 },
];

// --- Population composition by tier --------------------------------------

export const POPULATION_COMPOSITION_BY_TIER: Record<
  string,
  { peasant: number; artisan: number; merchant: number; soldier: number; scholar: number; noble: number }
> = {
  hamlet:     { peasant: 88, artisan:  6, merchant: 2, soldier:  3, scholar: 1, noble: 0 },
  steading:   { peasant: 82, artisan: 10, merchant: 3, soldier:  4, scholar: 1, noble: 0 },
  village:    { peasant: 75, artisan: 13, merchant: 4, soldier:  5, scholar: 2, noble: 1 },
  burgh:      { peasant: 65, artisan: 16, merchant: 6, soldier:  8, scholar: 3, noble: 2 },
  town:       { peasant: 55, artisan: 18, merchant: 8, soldier: 11, scholar: 5, noble: 3 },
  city:       { peasant: 50, artisan: 18, merchant: 9, soldier: 14, scholar: 6, noble: 3 },
  great_city: { peasant: 45, artisan: 18, merchant: 10, soldier: 16, scholar: 7, noble: 4 },
  capital:    { peasant: 42, artisan: 18, merchant: 11, soldier: 16, scholar: 7, noble: 6 },
};

// --- Occupation classes --------------------------------------------------

export const occupationClassesCatalogue = [
  {
    id: "peasant", displayName: "Peasant", rank: "common",
    description: "Farmers, herders, day-labourers. The broad base of every settlement; produce most of the food and provide levy soldiers in emergencies.",
    metadata: { military_potential: 0.4, tax_yield_per_capita: 1, food_cost_per_capita: 1, social_weight: 1 },
  },
  {
    id: "artisan", displayName: "Artisan", rank: "skilled",
    description: "Smiths, weavers, masons, carpenters. Convert raw materials into finished goods. Town backbone.",
    metadata: { military_potential: 0.2, tax_yield_per_capita: 3, food_cost_per_capita: 1, social_weight: 2 },
  },
  {
    id: "merchant", displayName: "Merchant", rank: "skilled",
    description: "Traders, shopkeepers, caravan masters. Move goods between settlements; collected tolls fund the treasury.",
    metadata: { military_potential: 0.1, tax_yield_per_capita: 5, food_cost_per_capita: 1, social_weight: 3 },
  },
  {
    id: "soldier", displayName: "Soldier", rank: "martial",
    description: "Garrisoned regulars and standing-army types — distinct from peasant levies. Already in arms; mobilising them doesn't cost morale.",
    metadata: { military_potential: 1.0, tax_yield_per_capita: 0, food_cost_per_capita: 2, social_weight: 2 },
  },
  {
    id: "scholar", displayName: "Scholar", rank: "skilled",
    description: "Scribes, clerics, lore-keepers, healers. Generate the DP from libraries and councils; staff Healing Houses.",
    metadata: { military_potential: 0.05, tax_yield_per_capita: 1, food_cost_per_capita: 1, social_weight: 4 },
  },
  {
    id: "noble", displayName: "Noble", rank: "elite",
    description: "Landed gentry, marshals, court officers. Few but high-status; shape council weight and faction leadership succession.",
    metadata: { military_potential: 0.3, tax_yield_per_capita: 8, food_cost_per_capita: 2, social_weight: 8 },
  },
];

// --- Unit types ----------------------------------------------------------

export const unitTypesCatalogue = [
  {
    id: "levy_spearman", displayName: "Levy Spearman", factionId: null, category: "T:Warrior",
    tierRequired: "village", recruitmentTimeDays: 2, popCost: 1, coinCost: 5,
    upkeepFoodDaily: 1, upkeepCoinDaily: 0, health: 12, armor: 2, morale: 40, speed: 1.0,
    description: "Conscripted farmer with a sharpened pole. Cheap and plentiful; rarely survives a charge.",
  },
  {
    id: "town_watch", displayName: "Town Watch", factionId: null, category: "T:Warrior",
    tierRequired: "burgh", recruitmentTimeDays: 3, popCost: 1, coinCost: 10,
    upkeepFoodDaily: 1, upkeepCoinDaily: 1, health: 18, armor: 4, morale: 55, speed: 1.0,
    description: "Townsman with mail and a sword. The backbone of urban garrisons.",
  },
  {
    id: "citadel_guard", displayName: "Citadel Guard", factionId: "gondor", category: "T:Elite",
    tierRequired: "city", recruitmentTimeDays: 5, popCost: 1, coinCost: 50,
    upkeepFoodDaily: 2, upkeepCoinDaily: 2, health: 28, armor: 9, morale: 90, speed: 0.9,
    description: "Elite household guards of the White City. Armoured in silvered steel, sworn to the Steward.",
  },
  {
    id: "rohirrim", displayName: "Rohirrim", factionId: "rohan", category: "T:Cavalry",
    tierRequired: "burgh", recruitmentTimeDays: 4, popCost: 1, coinCost: 30,
    upkeepFoodDaily: 3, upkeepCoinDaily: 1, health: 20, armor: 5, morale: 75, speed: 2.0,
    description: "Mounted spearmen of the Mark. Devastating on open ground; oathbound and tireless.",
  },
  {
    id: "galadhrim_warden", displayName: "Galadhrim Warden", factionId: "lothlorien", category: "T:Archer",
    tierRequired: "town", recruitmentTimeDays: 6, popCost: 1, coinCost: 40,
    upkeepFoodDaily: 1, upkeepCoinDaily: 1, health: 16, armor: 3, morale: 80, speed: 1.2,
    description: "Bowmen of the Golden Wood. Move unseen among trees; loose three shafts before the first reaches them.",
  },
  {
    id: "uruk_hai", displayName: "Uruk-hai", factionId: "mordor", category: "T:Warrior",
    tierRequired: "burgh", recruitmentTimeDays: 3, popCost: 1, coinCost: 15,
    upkeepFoodDaily: 2, upkeepCoinDaily: 0, health: 22, armor: 6, morale: 65, speed: 1.1,
    description: "Bred in the pits of Barad-dûr. Marches by day and by night, fears little.",
  },
];

// --- Unit recruitment material costs -------------------------------------

export const unitRecruitmentCostCatalogue = [
  { unitTypeId: "town_watch", resourceId: "R:Iron_Ingot", amount: 1 },
  { unitTypeId: "citadel_guard", resourceId: "R:Steel", amount: 2 },
  { unitTypeId: "citadel_guard", resourceId: "R:Wool", amount: 1 },
  { unitTypeId: "rohirrim", resourceId: "R:Iron_Ingot", amount: 1 },
  { unitTypeId: "rohirrim", resourceId: "R:Leather", amount: 1 },
  { unitTypeId: "galadhrim_warden", resourceId: "R:Wood", amount: 1 },
  { unitTypeId: "galadhrim_warden", resourceId: "R:Wool", amount: 1 },
  { unitTypeId: "uruk_hai", resourceId: "R:Iron_Ingot", amount: 1 },
];

// --- Unit attacks (weapons) ----------------------------------------------

export const unitAttacksCatalogue = [
  { unitTypeId: "levy_spearman", weaponName: "Spear", damage: 5, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "town_watch", weaponName: "Sword", damage: 6, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "citadel_guard", weaponName: "Longsword", damage: 9, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "citadel_guard", weaponName: "Throwing Spear", damage: 5, rangeType: "ranged", rangeBlocks: 8, ammo: 2 },
  { unitTypeId: "rohirrim", weaponName: "Lance", damage: 8, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "rohirrim", weaponName: "Sword", damage: 5, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "galadhrim_warden", weaponName: "Galadhrim Longbow", damage: 7, rangeType: "ranged", rangeBlocks: 12, ammo: 20 },
  { unitTypeId: "galadhrim_warden", weaponName: "Elven Knife", damage: 4, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "uruk_hai", weaponName: "Scimitar", damage: 7, rangeType: "melee", rangeBlocks: null, ammo: null },
  { unitTypeId: "uruk_hai", weaponName: "Crossbow", damage: 6, rangeType: "ranged", rangeBlocks: 10, ammo: 5 },
];

// --- Veterancy rank ladder (global) --------------------------------------

export const unitRanksCatalogue = [
  { rankKey: "green", displayName: "Green", level: 0, xpRequired: 0, healthMultPct: 90, damageMultPct: 90, moraleBonus: -10, description: "Raw recruits. Fight worse than the books say and break sooner." },
  { rankKey: "regular", displayName: "Regular", level: 1, xpRequired: 1, healthMultPct: 100, damageMultPct: 100, moraleBonus: 0, description: "Blooded once. The baseline the stat-block describes." },
  { rankKey: "veteran", displayName: "Veteran", level: 2, xpRequired: 3, healthMultPct: 115, damageMultPct: 110, moraleBonus: 10, description: "Survivors of several fights. Tougher, steadier, hit harder." },
  { rankKey: "elite", displayName: "Elite", level: 3, xpRequired: 6, healthMultPct: 130, damageMultPct: 125, moraleBonus: 20, description: "Legends in the making. A single elite stack can decide a battle." },
];

// --- Counter system (category matchups) ----------------------------------

export const unitCountersCatalogue = [
  { attackerCategory: "T:Cavalry", defenderCategory: "T:Archer", modifierPct: 60, note: "Riders ride down bowmen before the third volley." },
  { attackerCategory: "T:Cavalry", defenderCategory: "T:Warrior", modifierPct: -20, note: "Braced infantry blunt a charge." },
  { attackerCategory: "T:Archer", defenderCategory: "T:Warrior", modifierPct: 25, note: "Whittle them down at range before they close." },
  { attackerCategory: "T:Archer", defenderCategory: "T:Cavalry", modifierPct: -30, note: "Cavalry close the distance too fast." },
  { attackerCategory: "T:Warrior", defenderCategory: "T:Archer", modifierPct: 20, note: "Close in and butcher the lightly-armoured." },
];

// --- Terrain modifiers ---------------------------------------------------

export const unitTerrainModifiersCatalogue = [
  { category: "T:Cavalry", biome: "plain", modifierPct: 20, note: "Open ground for the charge." },
  { category: "T:Cavalry", biome: "forest", modifierPct: -40, note: "No room to charge among the trees." },
  { category: "T:Cavalry", biome: "mountain", modifierPct: -30, note: "Broken ground founders horses." },
  { category: "T:Archer", biome: "forest", modifierPct: 15, note: "Cover and ambush." },
  { category: "T:Warrior", biome: "mountain", modifierPct: 10, note: "Defensible high ground." },
];

// --- Combat traits + assignments -----------------------------------------

export const combatTraitsCatalogue = [
  { id: "anti_cavalry", displayName: "Anti-Cavalry", description: "Set spears: deadly to anything that charges.", effect: { vs_category: "T:Cavalry", damage_pct: 50 } },
  { id: "fear", displayName: "Fear", description: "The mere sight breaks lesser nerves.", effect: { enemy_morale_penalty: 15, radius_blocks: 10 } },
  { id: "forest_stalker", displayName: "Forest Stalker", description: "At home beneath the trees — no woodland penalty, and unseen until they strike.", effect: { ignore_terrain_penalty: "forest", stealth: true } },
  { id: "shieldwall", displayName: "Shield Wall", description: "Locked shields when they hold the line.", effect: { armor_bonus: 3, requires: "stationary" } },
  { id: "relentless", displayName: "Relentless", description: "Marches by day and by night without rest.", effect: { ignore_fatigue: true, march_bonus_pct: 25 } },
  { id: "tireless", displayName: "Tireless", description: "Elven endurance — never wearies on the long road.", effect: { ignore_fatigue: true } },
  { id: "charge", displayName: "Charge", description: "Devastating on the turn they close the distance.", effect: { charge_damage_pct: 100 } },
  { id: "volley", displayName: "Volley", description: "Looses massed arrows over the heads of the front line.", effect: { area_fire: true } },
];

export const unitTraitsCatalogue = [
  { unitTypeId: "levy_spearman", traitId: "anti_cavalry" },
  { unitTypeId: "citadel_guard", traitId: "shieldwall" },
  { unitTypeId: "citadel_guard", traitId: "fear" },
  { unitTypeId: "rohirrim", traitId: "charge" },
  { unitTypeId: "galadhrim_warden", traitId: "forest_stalker" },
  { unitTypeId: "galadhrim_warden", traitId: "tireless" },
  { unitTypeId: "galadhrim_warden", traitId: "volley" },
  { unitTypeId: "uruk_hai", traitId: "relentless" },
  { unitTypeId: "uruk_hai", traitId: "fear" },
];

// --- Unit abilities (active battle moves) --------------------------------

export const unitAbilitiesCatalogue = [
  { unitTypeId: "rohirrim", name: "Devastating Charge", cooldownTurns: 3, description: "A full-gallop lance charge across open ground.", effect: { damage_mult: 2.0, requires: "open_ground" } },
  { unitTypeId: "galadhrim_warden", name: "Arrow Storm", cooldownTurns: 4, description: "Every warden looses at once into a killing zone.", effect: { area_fire: true, damage_mult: 1.5 } },
  { unitTypeId: "citadel_guard", name: "Hold the Line", cooldownTurns: 5, description: "Shields locked, the Guard cannot be made to break.", effect: { morale_immune: true, duration_turns: 2 } },
  { unitTypeId: "uruk_hai", name: "Blood Frenzy", cooldownTurns: 4, description: "They throw aside defence for slaughter.", effect: { damage_mult: 1.5, armor_penalty: 2 } },
];
