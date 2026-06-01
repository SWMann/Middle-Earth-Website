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
