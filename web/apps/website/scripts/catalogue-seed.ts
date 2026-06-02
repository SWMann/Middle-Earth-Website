/**
 * Vertical-slice catalogue seed for the config.* tables.
 *
 * Goal: not 100+ districts, but a working supply chain that demonstrates
 * the whole system. Raw materials → industrial processing → military
 * recruitment, with tag-weighted satisfaction at every step.
 *
 *   Wheat ──┐
 *           ├─→ Bakery ──→ Bread (food)
 *   Coal  ──┤
 *           │
 *   Iron Ore ──→ Smithy (needs Fuel) ──→ Iron Ingot
 *                                       │
 *   Steel ←── Foundry (Iron Ingot + Coal-grade Fuel)
 *           │
 *   Wool  ──┤
 *   Leather ┤
 *           ├─→ unit recruitment (Citadel Guard, Rohirrim, etc.)
 *   Wood  ──┘
 *
 * The supply chain rule: a district consumes Tags (flexible) and produces
 * Resources (rigid). The tag-resource weights decide which resources
 * satisfy which contracts, and how strongly.
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
];

// --- Resource → Tag weights ----------------------------------------------

/** Each entry: which resource satisfies which tag, and how strongly. */
export const resourceTagMappings = [
  // Wheat
  { resourceId: "R:Wheat", tagId: "T:Grain", weight: 2 },
  // Wood — both fuel and building material
  { resourceId: "R:Wood", tagId: "T:Fuel", weight: 1 },
  { resourceId: "R:Wood", tagId: "T:Building", weight: 2 },
  // Coal — best fuel, mineral
  { resourceId: "R:Coal", tagId: "T:Fuel", weight: 3 },
  { resourceId: "R:Coal", tagId: "T:Mineral", weight: 2 },
  // Stone
  { resourceId: "R:Stone", tagId: "T:Building", weight: 3 },
  { resourceId: "R:Stone", tagId: "T:Mineral", weight: 2 },
  // Iron Ore — mineral and metal ore
  { resourceId: "R:Iron_Ore", tagId: "T:Mineral", weight: 1 },
  { resourceId: "R:Iron_Ore", tagId: "T:Metal_Ore", weight: 2 },
  // Iron Ingot — refined metal
  { resourceId: "R:Iron_Ingot", tagId: "T:Metal", weight: 2 },
  // Steel — top metal
  { resourceId: "R:Steel", tagId: "T:Metal", weight: 3 },
  // Hide / cloth
  { resourceId: "R:Leather", tagId: "T:Hide", weight: 2 },
  { resourceId: "R:Wool", tagId: "T:Cloth", weight: 2 },
  // Bread — food
  { resourceId: "R:Bread", tagId: "T:Food", weight: 2 },
];

// --- District types ------------------------------------------------------

export const districtTypesCatalogue = [
  // Residential
  {
    id: "hovel",
    displayName: "Hovel",
    category: "residential",
    tierMin: "hamlet",
    popCost: 0,
    populationCapProvided: 1,
    description:
      "A turf-and-wattle one-room dwelling. The smallest legitimate housing — single family, no amenities.",
  },
  {
    id: "cottage",
    displayName: "Cottage",
    category: "residential",
    tierMin: "village",
    popCost: 0,
    populationCapProvided: 3,
    description:
      "A small timber-framed home with a hearth. Extended family or two small ones.",
  },
  // Agricultural
  {
    id: "wheat_farm",
    displayName: "Wheat Farm",
    category: "agricultural",
    tierMin: "village",
    popCost: 4,
    description:
      "Fields of grain worked by farm hands. Foundation of any larger settlement's food supply.",
  },
  // Extraction
  {
    id: "logging_camp",
    displayName: "Logging Camp",
    category: "extraction",
    tierMin: "village",
    popCost: 2,
    description:
      "Felled timber from forested regions. Produces general-purpose Wood.",
  },
  {
    id: "stone_quarry",
    displayName: "Stone Quarry",
    category: "extraction",
    tierMin: "burgh",
    popCost: 3,
    description:
      "Open-face cut stone. Heavy work; needs mountain or rocky-plain tile.",
  },
  {
    id: "iron_mine",
    displayName: "Iron Mine",
    category: "extraction",
    tierMin: "burgh",
    popCost: 3,
    description:
      "Pit and shaft mining for iron ore. Consumes Fuel to keep tools and lamps running.",
  },
  // Industrial
  {
    id: "bakery",
    displayName: "Bakery",
    category: "industrial",
    tierMin: "village",
    popCost: 2,
    description:
      "Hearth-baked bread from grain. Settlement's daily food anchor.",
  },
  {
    id: "smithy",
    displayName: "Smithy",
    category: "industrial",
    tierMin: "burgh",
    popCost: 2,
    description:
      "Smelts ore into ingots. Higher-weight fuel yields cleaner metal.",
  },
  {
    id: "foundry",
    displayName: "Foundry",
    category: "industrial",
    tierMin: "town",
    popCost: 4,
    description:
      "Steel from iron under sustained heat. Requires high-grade fuel.",
  },
  // Military
  {
    id: "barracks",
    displayName: "Barracks",
    category: "military",
    tierMin: "burgh",
    popCost: 3,
    description:
      "Quarters for trained soldiers. Required at the settlement to recruit T:Warrior class units.",
  },
  // Defensive (walls) — mechanics_spec.md §5.5
  // metadata carries the wall-specific stats: defense_bonus_pct,
  // delay_of_engagement_hours, breach_difficulty, max_per_settlement
  {
    id: "basic_palisade",
    displayName: "Basic Palisade",
    category: "defensive",
    tierMin: "village",
    popCost: 0,
    description:
      "Sharpened logs driven into an earthen bank. Slows a charge, breaks under fire.",
    metadata: {
      defense_bonus_pct: 10,
      delay_of_engagement_hours: 24,
      breach_difficulty: "easy",
      breach_requires: ["any_ram", "fire"],
    },
  },
  {
    id: "advanced_palisade",
    displayName: "Advanced Palisade",
    category: "defensive",
    tierMin: "burgh",
    popCost: 0,
    description:
      "Doubled timber with a fighting platform. Buys real time but still wood.",
    metadata: {
      defense_bonus_pct: 20,
      delay_of_engagement_hours: 48,
      breach_difficulty: "easy",
      breach_requires: ["ram", "tower"],
    },
  },
  {
    id: "basic_stone_wall",
    displayName: "Basic Stone Wall",
    category: "defensive",
    tierMin: "town",
    popCost: 0,
    description:
      "Mortared stone, half a man-height thick. Archer cover; rams must work for it.",
    metadata: {
      defense_bonus_pct: 30,
      delay_of_engagement_hours: 72,
      breach_difficulty: "moderate",
      breach_requires: ["heavy_ram", "sustained_siege"],
      archer_cover: true,
    },
  },
  {
    id: "advanced_stone_wall",
    displayName: "Advanced Stone Wall",
    category: "defensive",
    tierMin: "city",
    popCost: 0,
    description:
      "Crenellated walls with archer towers and a sally port. The standard of cities.",
    metadata: {
      defense_bonus_pct: 40,
      delay_of_engagement_hours: 120,
      breach_difficulty: "hard",
      breach_requires: ["heavy_ram", "breach_charges"],
      archer_cover: true,
      ranged_retaliation: true,
    },
  },
  {
    id: "citadel_walls",
    displayName: "Citadel Walls",
    category: "defensive",
    tierMin: "great_city",
    popCost: 0,
    description:
      "Layered defences with inner keeps. A second wave of defenders forms behind the first.",
    metadata: {
      defense_bonus_pct: 50,
      delay_of_engagement_hours: 168,
      breach_difficulty: "very_hard",
      breach_requires: ["multiple_siege_engines", "days_of_effort"],
      archer_cover: true,
      ranged_retaliation: true,
      defender_waves: 1,
    },
  },
  {
    id: "capital_walls",
    displayName: "Capital Walls",
    category: "defensive",
    tierMin: "capital",
    popCost: 0,
    description:
      "The work of an age. Anorien-grade masonry, mithril-bound gates, two reserve garrisons. Only capitals.",
    metadata: {
      defense_bonus_pct: 60,
      delay_of_engagement_hours: 240,
      breach_difficulty: "extreme",
      breach_requires: ["specialised_siege_engineering"],
      archer_cover: true,
      ranged_retaliation: true,
      defender_waves: 2,
    },
  },
];

// --- District consumes (tag-based) ---------------------------------------

export const districtConsumesCatalogue = [
  // iron_mine consumes Fuel (any kind, even Wood weight=1)
  { districtTypeId: "iron_mine", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  // bakery consumes Grain + Fuel
  { districtTypeId: "bakery", tagId: "T:Grain", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "bakery", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  // smithy consumes Metal Ore + Fuel
  { districtTypeId: "smithy", tagId: "T:Metal_Ore", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "smithy", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  // foundry consumes Metal + high-grade Fuel (weight >= 2 — Coal works; Wood doesn't)
  { districtTypeId: "foundry", tagId: "T:Metal", weightMin: 2, dailyAmount: 1 },
  { districtTypeId: "foundry", tagId: "T:Fuel", weightMin: 2, dailyAmount: 2 },
];

// --- District produces (resource-based) ----------------------------------

export const districtProducesCatalogue = [
  { districtTypeId: "wheat_farm", resourceId: "R:Wheat", dailyAmount: 4 },
  { districtTypeId: "logging_camp", resourceId: "R:Wood", dailyAmount: 3 },
  { districtTypeId: "stone_quarry", resourceId: "R:Stone", dailyAmount: 3 },
  { districtTypeId: "iron_mine", resourceId: "R:Iron_Ore", dailyAmount: 2 },
  { districtTypeId: "bakery", resourceId: "R:Bread", dailyAmount: 8 },
  { districtTypeId: "smithy", resourceId: "R:Iron_Ingot", dailyAmount: 1 },
  { districtTypeId: "foundry", resourceId: "R:Steel", dailyAmount: 1 },
];

// --- Unit types ----------------------------------------------------------

export const unitTypesCatalogue = [
  // Standard units (no faction restriction)
  {
    id: "levy_spearman",
    displayName: "Levy Spearman",
    factionId: null,
    category: "T:Warrior",
    tierRequired: "village",
    recruitmentTimeDays: 2,
    popCost: 1,
    coinCost: 5,
    upkeepFoodDaily: 1,
    upkeepCoinDaily: 0,
    health: 12,
    armor: 2,
    morale: 40,
    speed: 1.0,
    description:
      "Conscripted farmer with a sharpened pole. Cheap and plentiful; rarely survives a charge.",
  },
  {
    id: "town_watch",
    displayName: "Town Watch",
    factionId: null,
    category: "T:Warrior",
    tierRequired: "burgh",
    recruitmentTimeDays: 3,
    popCost: 1,
    coinCost: 10,
    upkeepFoodDaily: 1,
    upkeepCoinDaily: 1,
    health: 18,
    armor: 4,
    morale: 55,
    speed: 1.0,
    description:
      "Townsman with mail and a sword. The backbone of urban garrisons.",
  },
  // Faction-specific
  {
    id: "citadel_guard",
    displayName: "Citadel Guard",
    factionId: "gondor",
    category: "T:Elite",
    tierRequired: "city",
    recruitmentTimeDays: 5,
    popCost: 1,
    coinCost: 50,
    upkeepFoodDaily: 2,
    upkeepCoinDaily: 2,
    health: 28,
    armor: 9,
    morale: 90,
    speed: 0.9,
    description:
      "Elite household guards of the White City. Armoured in silvered steel, sworn to the Steward.",
  },
  {
    id: "rohirrim",
    displayName: "Rohirrim",
    factionId: "rohan",
    category: "T:Cavalry",
    tierRequired: "burgh",
    recruitmentTimeDays: 4,
    popCost: 1,
    coinCost: 30,
    upkeepFoodDaily: 3,
    upkeepCoinDaily: 1,
    health: 20,
    armor: 5,
    morale: 75,
    speed: 2.0,
    description:
      "Mounted spearmen of the Mark. Devastating on open ground; oathbound and tireless.",
  },
  {
    id: "galadhrim_warden",
    displayName: "Galadhrim Warden",
    factionId: "lothlorien",
    category: "T:Archer",
    tierRequired: "town",
    recruitmentTimeDays: 6,
    popCost: 1,
    coinCost: 40,
    upkeepFoodDaily: 1,
    upkeepCoinDaily: 1,
    health: 16,
    armor: 3,
    morale: 80,
    speed: 1.2,
    description:
      "Bowmen of the Golden Wood. Move unseen among trees; loose three shafts before the first reaches them.",
  },
  {
    id: "uruk_hai",
    displayName: "Uruk-hai",
    factionId: "mordor",
    category: "T:Warrior",
    tierRequired: "burgh",
    recruitmentTimeDays: 3,
    popCost: 1,
    coinCost: 15,
    upkeepFoodDaily: 2,
    upkeepCoinDaily: 0,
    health: 22,
    armor: 6,
    morale: 65,
    speed: 1.1,
    description:
      "Bred in the pits of Barad-dûr. Marches by day and by night, fears little.",
  },
];

// --- Unit recruitment material costs -------------------------------------

// --- Population composition by tier --------------------------------------

/**
 * Default composition % per settlement tier. The seed loops every
 * settlement and applies the composition for its tier, rounded to
 * integers; any rounding remainder absorbs into the peasant class so
 * the total always matches the settlement's population number.
 *
 * Percentages sum to 100 for each tier.
 */
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
    id: "peasant",
    displayName: "Peasant",
    rank: "common",
    description:
      "Farmers, herders, day-labourers. The broad base of every settlement; produce most of the food and provide levy soldiers in emergencies.",
    metadata: {
      military_potential: 0.4,
      tax_yield_per_capita: 1,
      food_cost_per_capita: 1,
      social_weight: 1,
    },
  },
  {
    id: "artisan",
    displayName: "Artisan",
    rank: "skilled",
    description:
      "Smiths, weavers, masons, carpenters. Convert raw materials into finished goods. Town backbone.",
    metadata: {
      military_potential: 0.2,
      tax_yield_per_capita: 3,
      food_cost_per_capita: 1,
      social_weight: 2,
    },
  },
  {
    id: "merchant",
    displayName: "Merchant",
    rank: "skilled",
    description:
      "Traders, shopkeepers, caravan masters. Move goods between settlements; collected tolls fund the treasury.",
    metadata: {
      military_potential: 0.1,
      tax_yield_per_capita: 5,
      food_cost_per_capita: 1,
      social_weight: 3,
    },
  },
  {
    id: "soldier",
    displayName: "Soldier",
    rank: "martial",
    description:
      "Garrisoned regulars and standing-army types — distinct from peasant levies. Already in arms; mobilising them doesn't cost morale.",
    metadata: {
      military_potential: 1.0,
      tax_yield_per_capita: 0,
      food_cost_per_capita: 2,
      social_weight: 2,
    },
  },
  {
    id: "scholar",
    displayName: "Scholar",
    rank: "skilled",
    description:
      "Scribes, clerics, lore-keepers, healers. Generate the DP from libraries and councils; staff Healing Houses.",
    metadata: {
      military_potential: 0.05,
      tax_yield_per_capita: 1,
      food_cost_per_capita: 1,
      social_weight: 4,
    },
  },
  {
    id: "noble",
    displayName: "Noble",
    rank: "elite",
    description:
      "Landed gentry, marshals, court officers. Few but high-status; shape council weight and faction leadership succession.",
    metadata: {
      military_potential: 0.3,
      tax_yield_per_capita: 8,
      food_cost_per_capita: 2,
      social_weight: 8,
    },
  },
];

export const unitRecruitmentCostCatalogue = [
  // levy_spearman: no resource cost (coin only)
  // town_watch: 1× Iron Ingot
  { unitTypeId: "town_watch", resourceId: "R:Iron_Ingot", amount: 1 },
  // citadel_guard: 2× Steel + 1× Wool
  { unitTypeId: "citadel_guard", resourceId: "R:Steel", amount: 2 },
  { unitTypeId: "citadel_guard", resourceId: "R:Wool", amount: 1 },
  // rohirrim: 1× Iron Ingot + 1× Leather
  { unitTypeId: "rohirrim", resourceId: "R:Iron_Ingot", amount: 1 },
  { unitTypeId: "rohirrim", resourceId: "R:Leather", amount: 1 },
  // galadhrim_warden: 1× Wood + 1× Wool
  { unitTypeId: "galadhrim_warden", resourceId: "R:Wood", amount: 1 },
  { unitTypeId: "galadhrim_warden", resourceId: "R:Wool", amount: 1 },
  // uruk_hai: 1× Iron Ingot
  { unitTypeId: "uruk_hai", resourceId: "R:Iron_Ingot", amount: 1 },
];
