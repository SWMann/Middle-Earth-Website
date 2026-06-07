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
  // --- Production chains ---
  { id: "T:Rawhide", displayName: "Raw Hide", description: "Untanned skins, input to a tannery." },
  { id: "T:Textile", displayName: "Textile", description: "Finished woven cloth." },
  { id: "T:Timber", displayName: "Timber", description: "Sawn planks and dressed wood." },
  { id: "T:Ammunition", displayName: "Ammunition", description: "Arrows, bolts, and shot." },
  { id: "T:Drink", displayName: "Drink", description: "Ale, mead, and brewed goods." },
  { id: "T:ClayRaw", displayName: "Raw Clay", description: "Dug clay, input to a kiln." },
  { id: "T:GlassRaw", displayName: "Glass Sand", description: "Silica sand, input to a glassworks." },
  { id: "T:Goods", displayName: "Finished Goods", description: "Wrought wares — glass, pottery, and the like." },
  { id: "T:Luxury", displayName: "Luxury", description: "High-value finished goods for the wealthy." },
  { id: "T:Precious", displayName: "Precious", description: "Gold, gems, and precious materials for the goldsmith and the mint." },
  { id: "T:Seasoning", displayName: "Seasoning", description: "Salt and preservatives." },
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
  // --- Production chains ---
  { id: "R:Hide", displayName: "Raw Hide", description: "Untanned skins from herds and the hunt. Tan it into leather.", foodValue: 0 },
  { id: "R:Cloth", displayName: "Cloth", description: "Woven wool, fulled and finished. The weaver's stock.", foodValue: 0 },
  { id: "R:Planks", displayName: "Planks", description: "Sawn and dressed timber, ready for the joiner.", foodValue: 0 },
  { id: "R:Arrows", displayName: "Arrows", description: "Fletched shafts by the sheaf. The archer's want.", foodValue: 0 },
  { id: "R:Ale", displayName: "Ale", description: "Brewed from grain. The hearth's comfort and the tavern's trade.", foodValue: 4 },
  { id: "R:Clay", displayName: "Clay", description: "Dug and puddled clay, raw for the kiln.", foodValue: 0 },
  { id: "R:Brick", displayName: "Brick", description: "Fired clay block. Fireproof, and grander than rubble.", foodValue: 0 },
  { id: "R:Sand", displayName: "Glass Sand", description: "Fine silica, washed and graded for the furnace.", foodValue: 0 },
  { id: "R:Glass", displayName: "Glass", description: "Blown and cast panes and vessels. A mark of a wealthy town.", foodValue: 0 },
  { id: "R:Jewellery", displayName: "Jewellery", description: "Wrought precious metal and set stones. Worn by the great.", foodValue: 0 },
  // --- Deposits / extraction ---
  { id: "R:Gold", displayName: "Gold", description: "Soft, bright, and incorruptible. Coin, crown, and the goldsmith's stock.", foodValue: 0 },
  { id: "R:Gems", displayName: "Gems", description: "Cut stones from the deep workings. Tiny, and worth a king's ransom.", foodValue: 0 },
  { id: "R:Salt", displayName: "Salt", description: "White gold of the table. Preserves the catch and the winter store; trades far.", foodValue: 0 },
  { id: "R:Marble", displayName: "Marble", description: "Veined, polished fine-stone. The cladding of palaces and tombs.", foodValue: 0 },
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
  // --- Production chains ---
  { resourceId: "R:Hide", tagId: "T:Rawhide", weight: 2 },
  { resourceId: "R:Cloth", tagId: "T:Textile", weight: 3 },
  { resourceId: "R:Cloth", tagId: "T:Cloth", weight: 3 },
  { resourceId: "R:Planks", tagId: "T:Timber", weight: 3 },
  { resourceId: "R:Planks", tagId: "T:Building", weight: 2 },
  { resourceId: "R:Arrows", tagId: "T:Ammunition", weight: 2 },
  { resourceId: "R:Ale", tagId: "T:Drink", weight: 2 },
  { resourceId: "R:Ale", tagId: "T:Food", weight: 1 },
  { resourceId: "R:Clay", tagId: "T:ClayRaw", weight: 2 },
  { resourceId: "R:Brick", tagId: "T:Building", weight: 3 },
  { resourceId: "R:Sand", tagId: "T:GlassRaw", weight: 2 },
  { resourceId: "R:Glass", tagId: "T:Goods", weight: 3 },
  { resourceId: "R:Jewellery", tagId: "T:Luxury", weight: 3 },
  // --- Deposits ---
  { resourceId: "R:Gold", tagId: "T:Precious", weight: 2 },
  { resourceId: "R:Gold", tagId: "T:Metal", weight: 2 },
  { resourceId: "R:Gems", tagId: "T:Precious", weight: 3 },
  { resourceId: "R:Gems", tagId: "T:Luxury", weight: 2 },
  { resourceId: "R:Salt", tagId: "T:Seasoning", weight: 2 },
  { resourceId: "R:Salt", tagId: "T:Food", weight: 1 },
  { resourceId: "R:Marble", tagId: "T:Building", weight: 2 },
  { resourceId: "R:Marble", tagId: "T:Luxury", weight: 2 },
];

// --- Deposits (what extraction archetype districts can work) --------------
// method ties a deposit to an archetype: a Mine works 'mine' deposits, a
// Quarry works 'quarry', a Forestry Camp works 'forestry'. The player picks
// the deposit per district; output = baseYield × extraction buildings × tier.

export type DepositSeed = {
  id: string;
  displayName: string;
  resourceId: string;
  method: string;
  baseYield: number;
  tierMin?: string;
  biome?: string;
  terrain?: string;
  requiresDiscovery?: string;
  rarity?: string;
  note?: string;
};

export const depositsCatalogue: DepositSeed[] = [
  // Mine — ores and precious stuff, worked from shafts.
  { id: "iron", displayName: "Iron", resourceId: "R:Iron_Ore", method: "mine", baseYield: 2, tierMin: "burgh", biome: "mountain", rarity: "common", note: "The backbone of arms and tools." },
  { id: "coal", displayName: "Coal", resourceId: "R:Coal", method: "mine", baseYield: 3, tierMin: "burgh", biome: "mountain", rarity: "common", note: "The best smelting fuel — and the only source of it." },
  { id: "salt", displayName: "Rock Salt", resourceId: "R:Salt", method: "mine", baseYield: 2, tierMin: "village", biome: "mountain", rarity: "common", note: "Hewn from old sea-beds; preserves and trades well." },
  { id: "gold", displayName: "Gold", resourceId: "R:Gold", method: "mine", baseYield: 1, tierMin: "city", biome: "mountain", rarity: "uncommon", note: "Soft, bright, and coveted." },
  { id: "gems", displayName: "Gems", resourceId: "R:Gems", method: "mine", baseYield: 1, tierMin: "city", biome: "mountain", requiresDiscovery: "gems", rarity: "rare", note: "Only where a Prospector has struck a gem-bearing seam." },
  { id: "mithril", displayName: "Mithril", resourceId: "R:Mithril_Ore", method: "mine", baseYield: 1, tierMin: "city", biome: "mountain", requiresDiscovery: "mithril", rarity: "rare", note: "True-silver. Perilous to win, beyond price." },
  // Quarry — stone and earths, worked from open faces.
  { id: "stone", displayName: "Stone", resourceId: "R:Stone", method: "quarry", baseYield: 3, tierMin: "burgh", biome: "mountain", rarity: "common", note: "Quarried block, the foundation of everything." },
  { id: "marble", displayName: "Marble", resourceId: "R:Marble", method: "quarry", baseYield: 1, tierMin: "town", biome: "mountain", rarity: "uncommon", note: "Fine veined stone for palaces." },
  { id: "clay", displayName: "Clay", resourceId: "R:Clay", method: "quarry", baseYield: 4, tierMin: "village", terrain: "river", rarity: "common", note: "Dug from river banks for the kiln." },
  { id: "sand", displayName: "Glass Sand", resourceId: "R:Sand", method: "quarry", baseYield: 4, tierMin: "burgh", terrain: "coastal", rarity: "common", note: "Washed silica for the glassworks." },
  // Forestry — timber, worked from felling-stands.
  { id: "wood", displayName: "Timber", resourceId: "R:Wood", method: "forestry", baseYield: 3, tierMin: "village", biome: "forest", rarity: "common", note: "Felled and hauled from wooded land." },
  { id: "mallorn", displayName: "Mallorn", resourceId: "R:Mallorn", method: "forestry", baseYield: 1, tierMin: "town", biome: "forest", rarity: "rare", note: "Silver-barked, gold-leafed. Only the Galadhrim know the way of it." },
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
  /** Residential quarters: cap = beds in the housing buildings raised inside. */
  capFromHousing?: boolean;
  /** Residential quarters: the occupation class ceiling (and identity). */
  populationClass?: string;
  /** Industrial districts: output = sum of production buildings' outputs. */
  outputFromBuildings?: boolean;
  /** Extraction archetype: 'mine' | 'quarry' | 'forestry' (deposit-working). */
  extractionMethod?: string;
  metadata?: Record<string, unknown>;
};

export const districtTypesCatalogue: DistrictSeed[] = [
  // ----- Residential quarters (by population class) ----------------------
  // A residential district is a CLUSTER of housing buildings (see the house
  // family in buildingTypesCatalogue). Its population cap is the sum of the
  // beds inside (capFromHousing). populationClass is the quarter's CLASS
  // CEILING and identity: it accepts housing of that class or any lower-
  // standing one (a Noble Estate may include servant cottages; a Manor can't
  // drop into a peasant quarter). The population produced follows the actual
  // mix of housing the player raises. Several quarters per class.

  // Peasant — the broad base; hamlet → city coverage.
  {
    id: "crofters_holding", displayName: "Crofters' Holding", category: "residential", tierMin: "hamlet",
    capFromHousing: true, populationClass: "peasant", buildCoinCost: 0, buildTimeDays: 0,
    description: "Scattered turf-roofed homesteads worked by smallholders. The first housing a hamlet ever raises.",
  },
  {
    id: "cottage_quarter", displayName: "Cottage Quarter", category: "residential", tierMin: "village",
    capFromHousing: true, populationClass: "peasant", buildCoinCost: 20, buildTimeDays: 1,
    description: "A lane of timber-framed cottages with hearths and kitchen-gardens. The common housing of a village.",
  },
  {
    id: "fishing_village", displayName: "Fishing Village", category: "residential", tierMin: "village",
    capFromHousing: true, populationClass: "peasant", terrainRequirement: "coastal", buildCoinCost: 20, buildTimeDays: 1,
    description: "Net-lofts and fishers' huts along a strand or quay. Coastal tiles only — the sea is the larder.",
  },
  {
    id: "longhouse_steading", displayName: "Longhouse Steading", category: "residential", tierMin: "village",
    capFromHousing: true, populationClass: "peasant", buildCoinCost: 30, buildTimeDays: 2,
    description: "Communal halls where whole kin-groups live under one ridge. The way of the Northmen, the Rohirrim, and the hill-folk.",
  },
  {
    id: "common_quarter", displayName: "Common Quarter", category: "residential", tierMin: "city",
    capFromHousing: true, populationClass: "peasant", buildCoinCost: 80, buildTimeDays: 3,
    description: "Stacked tenements and crowded lanes housing a city's labouring multitude in the least ground.",
  },

  // Artisan — the working town.
  {
    id: "artisans_quarter", displayName: "Artisans' Quarter", category: "residential", tierMin: "burgh",
    capFromHousing: true, populationClass: "artisan", buildCoinCost: 60, buildTimeDays: 2,
    description: "Workshop-houses where the craft is plied downstairs and the family sleeps above. Sited beside the trades it serves.",
  },
  {
    id: "craft_lane", displayName: "Craft Lane", category: "residential", tierMin: "town",
    capFromHousing: true, populationClass: "artisan", buildCoinCost: 100, buildTimeDays: 3,
    description: "A denser street of guild-lodgings and craft-houses — looms, benches, and forges behind every shutter.",
  },

  // Merchant — the wealthy frontages.
  {
    id: "merchants_row", displayName: "Merchants' Row", category: "residential", tierMin: "town",
    capFromHousing: true, populationClass: "merchant", buildCoinCost: 120, buildTimeDays: 3,
    description: "Fine town-houses for the well-to-do — counting-rooms below, comfortable lodgings above.",
  },
  {
    id: "counting_quarter", displayName: "Counting Quarter", category: "residential", tierMin: "city",
    capFromHousing: true, populationClass: "merchant", buildCoinCost: 180, buildTimeDays: 4,
    description: "The merchant heart of a city — counting-houses and warehouse-lofts where the great trading families live above their ledgers.",
  },

  // Scholar — the lettered precincts.
  {
    id: "scholars_close", displayName: "Scholars' Close", category: "residential", tierMin: "town",
    capFromHousing: true, populationClass: "scholar", buildCoinCost: 120, buildTimeDays: 3,
    description: "Quiet lodgings for scribes, healers, and lore-keepers, set close by the library they serve.",
  },
  {
    id: "cloister", displayName: "Cloister", category: "residential", tierMin: "city",
    capFromHousing: true, populationClass: "scholar", buildCoinCost: 220, buildTimeDays: 5, maxPerSettlement: 2,
    description: "A walled precinct of study-cells around a quiet court. Houses an order of scholars and clerics.",
  },

  // Noble — few, but high.
  {
    id: "noble_estate", displayName: "Noble Estate", category: "residential", tierMin: "city",
    capFromHousing: true, populationClass: "noble", buildCoinCost: 300, buildTimeDays: 5, upkeepCoinDaily: 2, maxPerSettlement: 2,
    description: "A walled manor and its grounds — hall, stables, and servants' cottages. Houses few, but seats the powerful.",
  },
  {
    id: "high_quarter", displayName: "High Quarter", category: "residential", tierMin: "city",
    capFromHousing: true, populationClass: "noble", buildCoinCost: 260, buildTimeDays: 4, upkeepCoinDaily: 1, maxPerSettlement: 1,
    description: "The aristocratic district of a great city — town-manors and villas crowded behind their own gate.",
  },

  // ----- Agricultural -----
  {
    id: "wheat_farm", displayName: "Wheat Farm", category: "agricultural", tierMin: "village",
    popCost: 4, requiredBiomes: ["plain"], buildCoinCost: 30, buildTimeDays: 2,
    description: "Fields of grain worked by farm hands. Foundation of any larger settlement's food supply. Needs open plains.",
  },

  // ----- Extraction (deposit-working archetypes) -------------------------
  // A few generic districts work any deposit of their method (see
  // depositsCatalogue). The player picks the deposit per district; the tile
  // it needs (biome/terrain/discovery) comes from the chosen deposit, and
  // output = the deposit's yield × the shafts/faces/stands raised inside.
  {
    id: "mine", displayName: "Mine", category: "extraction", tierMin: "burgh", extractionMethod: "mine",
    popCost: 3, buildCoinCost: 80, buildTimeDays: 3,
    description: "Adits and shafts after ore, coal, salt, and the bright metals. Pick the seam; sink as many shafts as the workings will bear.",
  },
  {
    id: "deep_mine", displayName: "Deep Mine", category: "extraction", tierMin: "city", extractionMethod: "mine",
    popCost: 5, buildCoinCost: 250, buildTimeDays: 6, upkeepCoinDaily: 3,
    description: "A great delving with winding-engines and drainage — the only way to win gold, gems, and mithril from the deep rock. Many shafts, and perilous.",
  },
  {
    id: "quarry", displayName: "Quarry", category: "extraction", tierMin: "burgh", extractionMethod: "quarry",
    popCost: 2, buildCoinCost: 50, buildTimeDays: 2,
    description: "Open faces cut for stone, marble, clay, or glass-sand. Pick the bed; open as many faces as the ground allows.",
  },
  {
    id: "forestry_camp", displayName: "Forestry Camp", category: "extraction", tierMin: "village", extractionMethod: "forestry",
    popCost: 2, buildCoinCost: 25, buildTimeDays: 1,
    description: "Felling-stands and hauling-ways in the woods, after common timber or the rare mallorn. Output rides on how thickly the tile is wooded.",
  },

  // Raised herds (Wool + Hide for the textile and leather chains).
  {
    id: "pasture", displayName: "Pasture", category: "agricultural", tierMin: "village",
    popCost: 2, requiredBiomes: ["plain"], buildCoinCost: 25, buildTimeDays: 1,
    description: "Grazed flocks and herds — shorn for wool and slaughtered for hide. Needs open grassland.",
  },

  // ----- Industrial (output scales with the production buildings inside) ---
  {
    id: "bakery", displayName: "Bakery", category: "industrial", tierMin: "village",
    popCost: 2, buildCoinCost: 50, buildTimeDays: 2, outputFromBuildings: true,
    description: "Hearth-baked bread from grain. Output rises with every bakehouse you raise. Works far better beside a farm.",
  },
  {
    id: "charcoal_burner", displayName: "Charcoal Burner", category: "industrial", tierMin: "village",
    popCost: 1, buildCoinCost: 20, buildTimeDays: 1,
    description: "Smoulders raw timber into clean-burning charcoal. The smith's friend; the forester's enemy.",
  },
  {
    id: "smithy", displayName: "Smithy", category: "industrial", tierMin: "burgh",
    popCost: 2, buildCoinCost: 100, buildTimeDays: 3, outputFromBuildings: true,
    description: "Smelts ore into ingots — a forge at a time. More forges, more iron (and more slag).",
  },
  {
    id: "foundry", displayName: "Foundry", category: "industrial", tierMin: "town",
    popCost: 4, buildCoinCost: 250, buildTimeDays: 5, upkeepCoinDaily: 2, outputFromBuildings: true,
    description: "Steel from iron under sustained heat. Each blast-furnace adds to the yield; needs high-grade fuel.",
  },
  {
    id: "sawmill", displayName: "Sawmill", category: "industrial", tierMin: "village",
    popCost: 2, buildCoinCost: 60, buildTimeDays: 2, outputFromBuildings: true,
    description: "Frame-saws dress felled timber into planks. Output rises with every saw-frame.",
  },
  {
    id: "tannery", displayName: "Tannery", category: "industrial", tierMin: "burgh",
    popCost: 2, buildCoinCost: 70, buildTimeDays: 2, outputFromBuildings: true,
    description: "Tans raw hide into leather over weeks in the pits. Sited downwind, always.",
  },
  {
    id: "weavers_mill", displayName: "Weavers' Mill", category: "industrial", tierMin: "burgh",
    popCost: 2, buildCoinCost: 70, buildTimeDays: 2, outputFromBuildings: true,
    description: "Looms turn raw wool into finished cloth — the backbone of trade and the armourer's padding.",
  },
  {
    id: "brewery", displayName: "Brewery", category: "industrial", tierMin: "village",
    popCost: 2, buildCoinCost: 60, buildTimeDays: 2, outputFromBuildings: true,
    description: "Mash, boil, and cask grain into ale. Every vat adds to the settlement's cheer and its tolls.",
  },
  {
    id: "kiln_yard", displayName: "Kiln Yard", category: "industrial", tierMin: "burgh",
    popCost: 2, buildCoinCost: 80, buildTimeDays: 2, outputFromBuildings: true,
    description: "Wood-fired kilns bake river-clay into brick. Fireproof building stock for a growing town.",
  },
  {
    id: "fletcher", displayName: "Fletcher's Yard", category: "military", tierMin: "town",
    popCost: 2, buildCoinCost: 80, buildTimeDays: 2, outputFromBuildings: true,
    description: "Shafts, heads, and feathers married into arrows by the sheaf. The archer's supply.",
  },
  {
    id: "glassworks", displayName: "Glassworks", category: "industrial", tierMin: "town",
    popCost: 3, buildCoinCost: 150, buildTimeDays: 4, upkeepCoinDaily: 1, outputFromBuildings: true,
    description: "Furnaces melt sand to glass for panes and vessels — a luxury of the wealthier towns.",
  },

  // ----- Trade & logistics -----
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
  {
    id: "trade_warehouse", displayName: "Trade Warehouse", category: "trade", tierMin: "town",
    popCost: 2, buildCoinCost: 120, buildTimeDays: 3, outputFromBuildings: true,
    description: "Bonded stores and a carter's yard. Every warehouse moves more goods, and skims more coin in the moving.",
  },

  // ----- Luxury (DP) -----
  {
    id: "mint", displayName: "Mint", category: "luxury", tierMin: "city",
    popCost: 2, buildCoinCost: 300, buildTimeDays: 4, upkeepCoinDaily: 2, maxPerSettlement: 1, outputFromBuildings: true,
    description: "Strikes bullion into coin under the lord's seal. Turns refined metal straight into treasury.",
  },
  {
    id: "jeweller", displayName: "Jeweller", category: "luxury", tierMin: "city",
    popCost: 2, buildCoinCost: 250, buildTimeDays: 4, outputFromBuildings: true,
    description: "Works precious metal and true-silver into jewellery for the great houses and foreign courts.",
  },
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

// --- District staffing (by occupation class) -----------------------------

export const districtStaffingCatalogue = [
  // Extraction archetypes (miners, quarriers, woodsmen — peasant labour).
  { districtTypeId: "mine", classId: "peasant", count: 3 },
  { districtTypeId: "deep_mine", classId: "peasant", count: 4 },
  { districtTypeId: "deep_mine", classId: "artisan", count: 1 },
  { districtTypeId: "quarry", classId: "peasant", count: 3 },
  { districtTypeId: "forestry_camp", classId: "peasant", count: 2 },
  { districtTypeId: "wheat_farm", classId: "peasant", count: 4 },
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
];

// --- District prerequisites ----------------------------------------------

export const districtPrerequisitesCatalogue = [
  { districtTypeId: "foundry", prerequisiteDistrictTypeId: "smithy" },
];

// --- District adjacency bonuses ------------------------------------------

export const districtAdjacencyBonusesCatalogue = [
  { districtTypeId: "bakery", adjacentDistrictTypeId: "wheat_farm", bonusType: "output_pct", bonusValue: 20 },
  { districtTypeId: "smithy", adjacentDistrictTypeId: "mine", bonusType: "output_pct", bonusValue: 15 },
  { districtTypeId: "foundry", adjacentDistrictTypeId: "smithy", bonusType: "output_pct", bonusValue: 10 },
  { districtTypeId: "charcoal_burner", adjacentDistrictTypeId: "forestry_camp", bonusType: "output_pct", bonusValue: 25 },
  { districtTypeId: "market", adjacentDistrictTypeId: "harbour", bonusType: "output_pct", bonusValue: 20 },
];

// --- Faction district rules (restrict / unlock / override / modify) ------

export const factionDistrictRulesCatalogue = [
  // Shire: hobbits don't do heavy industry or war-breeding.
  { factionId: "shire", districtTypeId: "mine", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "deep_mine", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "foundry", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "charcoal_burner", ruleType: "restrict", params: {} },
  { factionId: "shire", districtTypeId: "uruk_pit", ruleType: "restrict", params: {} },
  // Shire: but they farm from the very start — wheat farms at hamlet tier.
  { factionId: "shire", districtTypeId: "wheat_farm", ruleType: "modify", params: { tier_min: "hamlet" } },

  // Uruk Pit: only the Dark powers may breed them.
  { factionId: "mordor", districtTypeId: "uruk_pit", ruleType: "unlock", params: {} },
  { factionId: "isengard", districtTypeId: "uruk_pit", ruleType: "unlock", params: {} },

  // Mallorn Grove: Lothlórien alone keeps the way of it.

  // Swan Knight Hall: Dol Amroth's exclusively. And for them, it REPLACES
  // the ordinary barracks — their footsoldiers train as knights.
  { factionId: "dol_amroth", districtTypeId: "swan_knight_hall", ruleType: "unlock", params: {} },
  { factionId: "dol_amroth", districtTypeId: "barracks", ruleType: "override", params: { with: "swan_knight_hall" } },
];

// --- Functional components (floorplanner markers) ------------------------

export const functionalComponentsCatalogue = [
  { id: "BED", displayName: "Bed", description: "A place to sleep. Residential districts need one per inhabitant of cap." },
  { id: "DOOR", displayName: "Door", description: "A working entrance. Every enclosed build needs at least one." },
  { id: "STORAGE", displayName: "Storage", description: "Chest, barrel, or crate. Holds the district's stock." },
  { id: "COOKING", displayName: "Cooking Station", description: "Furnace, smoker, or campfire for preparing food." },
  { id: "HEARTH", displayName: "Hearth", description: "A fireplace. Warmth, and the heart of a gathering space." },
  { id: "ANVIL", displayName: "Anvil", description: "For shaping metal. The smith's core tool." },
  { id: "FORGE", displayName: "Forge", description: "A blast furnace or smelter for working ore at heat." },
  { id: "ALTAR", displayName: "Altar", description: "A focus of worship or reverence." },
  { id: "ARROW_RACK", displayName: "Arrow Rack", description: "Racked weapons and ammunition. Marks a martial building." },
  { id: "STABLE_STALL", displayName: "Stall", description: "Housing for a single mount." },
  { id: "WELL", displayName: "Well", description: "A clean water source. Vital to healing and to large settlements." },
  { id: "LECTERN", displayName: "Lectern", description: "A reading and writing station. The scholar's seat." },
  { id: "TABLE", displayName: "Table", description: "A surface to gather around — for trade, dining, or council." },
  { id: "BANNER", displayName: "Banner", description: "Hung heraldry. Marks a seat of authority." },
];

// --- Building types -------------------------------------------------------

// Shape: provides lists the component ids; `quantities` overrides the
// default of 1 for any component supplied in bulk. Intrinsic stats
// (tierMin, footprint, upgradesFrom/level) are optional.
export type BuildingSeed = {
  id: string;
  displayName: string;
  category: string;
  description: string;
  provides: string[];
  quantities?: Record<string, number>;
  tierMin?: string;
  minFootprintBlocks?: number;
  maxFootprintBlocks?: number;
  minHeightBlocks?: number;
  upgradesFrom?: string;
  level?: number;
  /** For housing: the occupation class this building shelters. */
  housingClass?: string;
};

export const buildingTypesCatalogue: BuildingSeed[] = [
  // --- Housing (the residential building family) -------------------------
  // Each provides BED in quantity — a residential quarter's population cap
  // is the sum of the beds inside it. Every housing building carries a
  // housingClass; a quarter accepts housing of its own class or any lower-
  // standing one (peasant < artisan < merchant < scholar < noble). All are
  // tagged theme:residential so they satisfy a quarter's housing slot.
  // Culture variants reskin them (a Hobbit smial, a Rohirric cot, …).

  // Peasant — the broad base. Cheap, small, and the most options.
  { id: "hovel", displayName: "Hovel", category: "residential", housingClass: "peasant", description: "A turf-and-wattle one-room dwelling. The smallest legitimate housing.", provides: ["BED"], quantities: { BED: 2 }, tierMin: "hamlet", minFootprintBlocks: 16, maxFootprintBlocks: 49, minHeightBlocks: 3, level: 1 },
  { id: "cottage", displayName: "Cottage", category: "residential", housingClass: "peasant", description: "A timber-framed home with a hearth and a kitchen-garden.", provides: ["BED", "HEARTH"], quantities: { BED: 4 }, tierMin: "village", minFootprintBlocks: 36, maxFootprintBlocks: 100, minHeightBlocks: 4, upgradesFrom: "hovel", level: 2 },
  { id: "house", displayName: "House", category: "residential", housingClass: "peasant", description: "A prosperous freeholder's two-storey home with outbuildings.", provides: ["BED", "HEARTH"], quantities: { BED: 6 }, tierMin: "burgh", minFootprintBlocks: 64, maxFootprintBlocks: 200, minHeightBlocks: 6, upgradesFrom: "cottage", level: 3 },
  { id: "croft", displayName: "Croft", category: "residential", housingClass: "peasant", description: "A smallholding cottage with its own strip of garden and a beast-shed.", provides: ["BED", "HEARTH"], quantities: { BED: 3 }, tierMin: "hamlet", minFootprintBlocks: 30, maxFootprintBlocks: 90, minHeightBlocks: 3 },
  { id: "cotters_cabin", displayName: "Cotter's Cabin", category: "residential", housingClass: "peasant", description: "A landless labourer's one-room cabin, raised quick and cheap.", provides: ["BED"], quantities: { BED: 2 }, tierMin: "hamlet", minFootprintBlocks: 16, maxFootprintBlocks: 40, minHeightBlocks: 3 },
  { id: "fishers_hut", displayName: "Fisher's Hut", category: "residential", housingClass: "peasant", description: "A net-loft and living-room on the strand, smelling of tar and brine.", provides: ["BED", "STORAGE"], quantities: { BED: 3 }, tierMin: "village", minFootprintBlocks: 25, maxFootprintBlocks: 80, minHeightBlocks: 4 },
  { id: "longhouse", displayName: "Longhouse", category: "residential", housingClass: "peasant", description: "A communal hall where a whole kin-group lives under one ridge.", provides: ["BED", "HEARTH", "TABLE"], quantities: { BED: 10, HEARTH: 2 }, tierMin: "village", minFootprintBlocks: 80, maxFootprintBlocks: 220, minHeightBlocks: 6 },
  { id: "tenement", displayName: "Tenement", category: "residential", housingClass: "peasant", description: "Stacked dwellings sharing stair and yard — the city's densest housing.", provides: ["BED"], quantities: { BED: 12 }, tierMin: "city", minFootprintBlocks: 80, maxFootprintBlocks: 200, minHeightBlocks: 12 },

  // Artisan — workshop-homes.
  { id: "craft_cottage", displayName: "Craft Cottage", category: "residential", housingClass: "artisan", description: "A cottage with a workbench by the window and a tool-store.", provides: ["BED", "HEARTH", "STORAGE"], quantities: { BED: 4 }, tierMin: "village", minFootprintBlocks: 40, maxFootprintBlocks: 110, minHeightBlocks: 4 },
  { id: "workshop_house", displayName: "Workshop House", category: "residential", housingClass: "artisan", description: "Craft plied on the ground floor, the family lodged above.", provides: ["BED", "HEARTH", "STORAGE"], quantities: { BED: 6 }, tierMin: "burgh", minFootprintBlocks: 60, maxFootprintBlocks: 180, minHeightBlocks: 6, upgradesFrom: "craft_cottage", level: 2 },
  { id: "weavers_house", displayName: "Weaver's House", category: "residential", housingClass: "artisan", description: "A tall, loom-lit house with wide upper windows for the work.", provides: ["BED", "STORAGE"], quantities: { BED: 5 }, tierMin: "burgh", minFootprintBlocks: 40, maxFootprintBlocks: 120, minHeightBlocks: 8 },
  { id: "guild_lodging", displayName: "Guild Lodging", category: "residential", housingClass: "artisan", description: "Shared lodging above a guild hall for journeymen and apprentices.", provides: ["BED", "TABLE"], quantities: { BED: 8 }, tierMin: "town", minFootprintBlocks: 80, maxFootprintBlocks: 220, minHeightBlocks: 7 },

  // Merchant — the wealthy frontages.
  { id: "townhouse", displayName: "Town House", category: "residential", housingClass: "merchant", description: "A narrow, tall row-house that wrings many beds from a small frontage.", provides: ["BED", "HEARTH"], quantities: { BED: 6 }, tierMin: "town", minFootprintBlocks: 36, maxFootprintBlocks: 110, minHeightBlocks: 9 },
  { id: "merchant_house", displayName: "Merchant House", category: "residential", housingClass: "merchant", description: "A counting-room below, comfortable lodgings and a strong-room above.", provides: ["BED", "HEARTH", "STORAGE"], quantities: { BED: 8 }, tierMin: "town", minFootprintBlocks: 80, maxFootprintBlocks: 240, minHeightBlocks: 8, upgradesFrom: "townhouse", level: 2 },
  { id: "counting_house", displayName: "Counting House", category: "residential", housingClass: "merchant", description: "Ledgers, scales, and a clerk's lodging over a tiled hall.", provides: ["BED", "STORAGE"], quantities: { BED: 5 }, tierMin: "city", minFootprintBlocks: 60, maxFootprintBlocks: 180, minHeightBlocks: 7 },
  { id: "warehouse_loft", displayName: "Warehouse Loft", category: "residential", housingClass: "merchant", description: "Lodging over a goods-warehouse by the wharves and gates.", provides: ["BED", "STORAGE"], quantities: { BED: 10, STORAGE: 2 }, tierMin: "city", minFootprintBlocks: 100, maxFootprintBlocks: 300, minHeightBlocks: 8 },

  // Scholar — the lettered lodgings.
  { id: "scholars_lodging", displayName: "Scholar's Lodging", category: "residential", housingClass: "scholar", description: "Quiet rooms with a writing-desk, close by the library.", provides: ["BED", "LECTERN"], quantities: { BED: 4 }, tierMin: "town", minFootprintBlocks: 40, maxFootprintBlocks: 120, minHeightBlocks: 5 },
  { id: "study_house", displayName: "Study House", category: "residential", housingClass: "scholar", description: "A scholar's house with a shelved study and a small hearth.", provides: ["BED", "HEARTH", "LECTERN"], quantities: { BED: 6 }, tierMin: "town", minFootprintBlocks: 60, maxFootprintBlocks: 160, minHeightBlocks: 6, upgradesFrom: "scholars_lodging", level: 2 },
  { id: "cloister_cell", displayName: "Cloister Cells", category: "residential", housingClass: "scholar", description: "A range of plain study-cells around a quiet court.", provides: ["BED", "LECTERN"], quantities: { BED: 8, LECTERN: 2 }, tierMin: "city", minFootprintBlocks: 80, maxFootprintBlocks: 240, minHeightBlocks: 6 },

  // Noble — few, but high.
  { id: "town_manor", displayName: "Town Manor", category: "residential", housingClass: "noble", description: "An urban noble residence behind its own wall and gate.", provides: ["BED", "HEARTH", "TABLE"], quantities: { BED: 8, HEARTH: 2 }, tierMin: "town", minFootprintBlocks: 120, maxFootprintBlocks: 320, minHeightBlocks: 8 },
  { id: "manor_house", displayName: "Manor House", category: "residential", housingClass: "noble", description: "A walled hall with servants' quarters — houses a lord and his household.", provides: ["BED", "HEARTH", "TABLE"], quantities: { BED: 10, HEARTH: 2 }, tierMin: "town", minFootprintBlocks: 150, maxFootprintBlocks: 400, minHeightBlocks: 8 },
  { id: "villa", displayName: "Villa", category: "residential", housingClass: "noble", description: "A grand country seat with garden courts and a colonnade.", provides: ["BED", "HEARTH", "TABLE"], quantities: { BED: 14, HEARTH: 3 }, tierMin: "city", minFootprintBlocks: 200, maxFootprintBlocks: 600, minHeightBlocks: 8, upgradesFrom: "manor_house", level: 2 },
  { id: "great_house", displayName: "Great House", category: "residential", housingClass: "noble", description: "The towered seat of a great family — a hall, wings, and a private court.", provides: ["BED", "HEARTH", "TABLE", "BANNER"], quantities: { BED: 16, HEARTH: 3 }, tierMin: "city", minFootprintBlocks: 250, maxFootprintBlocks: 700, minHeightBlocks: 10, upgradesFrom: "villa", level: 3 },

  { id: "bunkhouse", displayName: "Bunkhouse", category: "functional", description: "Rows of bunks under one roof — soldiers' billets.", provides: ["BED"], quantities: { BED: 8 }, minFootprintBlocks: 30, maxFootprintBlocks: 120 },
  { id: "bakehouse", displayName: "Bakehouse", category: "functional", description: "Ovens, a kneading-bench, a flour-bin.", provides: ["COOKING"], minFootprintBlocks: 25 },
  { id: "great_bakehouse", displayName: "Great Bakehouse", category: "functional", description: "A double-oven bakery turning out bread for a whole quarter.", provides: ["COOKING", "STORAGE"], quantities: { COOKING: 2 }, tierMin: "town", minFootprintBlocks: 80, minHeightBlocks: 6, upgradesFrom: "bakehouse", level: 2 },
  { id: "flour_mill", displayName: "Flour Mill", category: "functional", description: "A millstone, geared to wind.", provides: ["STORAGE"], minHeightBlocks: 6 },
  { id: "watermill", displayName: "Watermill", category: "functional", description: "A millstone driven by an undershot wheel. Needs running water.", provides: ["STORAGE"], quantities: { STORAGE: 2 }, minFootprintBlocks: 30 },
  { id: "forge_building", displayName: "Forge House", category: "functional", description: "A stone-hooded smelting forge.", provides: ["FORGE"], minFootprintBlocks: 25 },
  { id: "anvil_shed", displayName: "Anvil Shed", category: "functional", description: "An anvil, a slack-tub, a rack of tongs.", provides: ["ANVIL"] },
  { id: "granary", displayName: "Granary", category: "functional", description: "Raised, dry, rodent-proofed grain store.", provides: ["STORAGE"], quantities: { STORAGE: 2 } },
  { id: "captains_hall", displayName: "Captain's Hall", category: "structural", description: "The seat where a settlement's leader holds court.", provides: ["TABLE", "BANNER"], tierMin: "town", minFootprintBlocks: 36, minHeightBlocks: 6 },
  { id: "tower_armoury", displayName: "Tower Armoury", category: "functional", description: "Racked arms and a watch-room.", provides: ["ARROW_RACK", "STORAGE"], quantities: { ARROW_RACK: 2 }, minHeightBlocks: 8 },
  { id: "stable_block", displayName: "Stable Block", category: "functional", description: "Stalls, a tack-room, a paddock gate.", provides: ["STABLE_STALL"], quantities: { STABLE_STALL: 4 }, minFootprintBlocks: 40 },
  { id: "watchpost", displayName: "Watchpost", category: "structural", description: "An elevated lookout with a signal-beacon.", provides: [], minHeightBlocks: 12 },
  { id: "healing_ward", displayName: "Healing Ward", category: "functional", description: "Clean cots, a herb-store, a warm fire.", provides: ["BED", "HEARTH"], quantities: { BED: 4 } },
  { id: "scriptorium", displayName: "Scriptorium", category: "functional", description: "Writing-desks and shelved scrolls.", provides: ["LECTERN", "STORAGE"], quantities: { LECTERN: 2 }, tierMin: "town", minFootprintBlocks: 30 },
  { id: "market_stalls", displayName: "Market Stalls", category: "functional", description: "Covered trading stalls and a weigh-house.", provides: ["TABLE"], quantities: { TABLE: 3 } },
  { id: "hearth_hall", displayName: "Hearth Hall", category: "structural", description: "A long hall around a central fire.", provides: ["HEARTH", "TABLE"], quantities: { TABLE: 2 }, minFootprintBlocks: 48, minHeightBlocks: 5 },
  { id: "chapel", displayName: "Chapel", category: "landmark", description: "A small place of reverence.", provides: ["ALTAR"], minHeightBlocks: 7 },
  { id: "well_house", displayName: "Well House", category: "functional", description: "A roofed, drawn well.", provides: ["WELL"] },

  // --- Production buildings (carry building_outputs; output districts scale
  //     with how many you raise) -----------------------------------------
  { id: "blast_furnace", displayName: "Blast Furnace", category: "functional", description: "A tall stone stack with bellows, smelting iron to steel under sustained heat.", provides: ["FORGE"], minFootprintBlocks: 30, minHeightBlocks: 9 },
  { id: "loom", displayName: "Loom House", category: "functional", description: "Warp-weighted looms and fulling-troughs.", provides: ["STORAGE"], minFootprintBlocks: 25 },
  { id: "tan_pit", displayName: "Tan-Pit Shed", category: "functional", description: "Lime-pits and bark-liquor vats. It smells.", provides: ["STORAGE"], minFootprintBlocks: 30 },
  { id: "saw_frame", displayName: "Saw-Frame", category: "functional", description: "A water-driven frame-saw and a drying-stack.", provides: ["STORAGE"], minFootprintBlocks: 30 },
  { id: "fletching_bench", displayName: "Fletching Bench", category: "functional", description: "Shaft-lathes, glue-pots, and a feather-store.", provides: ["STORAGE"] },
  { id: "brewing_vat", displayName: "Brewing Vat-House", category: "functional", description: "Mash-tuns, a copper, and cool cellars.", provides: ["STORAGE"], minFootprintBlocks: 25 },
  { id: "kiln", displayName: "Kiln", category: "functional", description: "A wood-fired brick-and-pottery kiln.", provides: [], minHeightBlocks: 6 },
  { id: "glass_furnace", displayName: "Glass Furnace", category: "functional", description: "A roaring furnace, a blowing-bench, and an annealing-oven.", provides: ["FORGE"], minHeightBlocks: 7 },
  { id: "jewellers_bench", displayName: "Jeweller's Bench", category: "functional", description: "A goldsmith's bench with crucible, draw-plate, and a strong-box.", provides: ["STORAGE"] },
  { id: "mint_press", displayName: "Mint Press", category: "functional", description: "Dies and a screw-press striking coin from bullion.", provides: ["STORAGE"] },
  { id: "warehouse", displayName: "Warehouse", category: "functional", description: "A great bonded store for goods in transit.", provides: ["STORAGE"], quantities: { STORAGE: 4 }, minFootprintBlocks: 60 },
  { id: "loading_dock", displayName: "Loading Dock", category: "functional", description: "Cranes, weigh-beams, and a carter's yard.", provides: ["STORAGE"] },

  // --- Support / upgrade buildings (optional; buff the district they sit in;
  //     tagged support:industrial, carry building_effects) ----------------
  { id: "foremans_office", displayName: "Foreman's Office", category: "support", description: "An overseer's counting-room — keeps every bench at work and the stock moving.", provides: ["TABLE"], tierMin: "burgh", minFootprintBlocks: 20 },
  { id: "masters_workshop", displayName: "Master's Workshop", category: "support", description: "A master craftsman's bench. The whole yard works to a higher standard.", provides: ["STORAGE"], tierMin: "town", minFootprintBlocks: 30 },
  { id: "water_wheel", displayName: "Water Wheel", category: "support", description: "A great undershot wheel driving shafts and hammers. Needs running water.", provides: [], minHeightBlocks: 6 },
  { id: "goods_store", displayName: "Goods Store", category: "support", description: "A dry, bonded store — finished stock kept safe and counted, less lost to spoil.", provides: ["STORAGE"], quantities: { STORAGE: 3 }, minFootprintBlocks: 40 },
  { id: "materials_store", displayName: "Materials Store", category: "support", description: "Racked and sheltered raw stock, drawn as needed — less waste at the bench.", provides: ["STORAGE"], quantities: { STORAGE: 2 }, minFootprintBlocks: 30 },
  { id: "counting_room", displayName: "Counting Room", category: "support", description: "Ledgers and a strong-box. Sharp factors fetch a better price for the goods.", provides: ["STORAGE"], tierMin: "town" },

  // --- Extraction output buildings (no fixed output — the chosen deposit
  //     sets what they win; output scales with how many you raise) --------
  { id: "mine_shaft", displayName: "Mine Shaft", category: "functional", description: "A sunk shaft with ladder-ways, a pit-head, and a spoil-heap.", provides: ["STORAGE"], minHeightBlocks: 8 },
  { id: "quarry_face", displayName: "Quarry Face", category: "functional", description: "A worked stone face with sledways and a dressing-floor.", provides: ["STORAGE"], minFootprintBlocks: 40 },
  { id: "logging_stand", displayName: "Felling Stand", category: "functional", description: "A cleared felling-stand with a hauling-way and a log-pond.", provides: ["STORAGE"], minFootprintBlocks: 40 },

  // --- Extraction upgrades (support:extraction) ------------------------
  { id: "drainage_pump", displayName: "Drainage Pump", category: "support", description: "A chain-pump that keeps the deep workings clear of water.", provides: [], minHeightBlocks: 5 },
  { id: "winding_gear", displayName: "Winding Gear", category: "support", description: "A horse- or water-driven hoist that hauls more from greater depth.", provides: [], minHeightBlocks: 8 },
  { id: "ore_washery", displayName: "Ore Washery", category: "support", description: "Stamps and washing-tables that recover more good stuff from the spoil.", provides: ["STORAGE"], minFootprintBlocks: 30 },
];

// --- Building effects (district buffs from optional support buildings) ----

export const buildingEffectsCatalogue = [
  { buildingTypeId: "foremans_office", effectType: "output_pct", magnitude: 10, note: "Kept at the bench by an overseer." },
  { buildingTypeId: "masters_workshop", effectType: "output_pct", magnitude: 15, note: "Worked to a master's standard." },
  { buildingTypeId: "water_wheel", effectType: "output_pct", magnitude: 12, note: "Mechanical power drives the works." },
  { buildingTypeId: "goods_store", effectType: "output_pct", magnitude: 5, note: "Less finished stock lost to spoil." },
  { buildingTypeId: "goods_store", effectType: "storage_capacity", magnitude: 100, note: "Bonded headroom for stock." },
  { buildingTypeId: "materials_store", effectType: "input_reduction_pct", magnitude: 20, note: "Banked inputs, less waste." },
  { buildingTypeId: "counting_room", effectType: "coin_pct", magnitude: 20, note: "A better price for the goods." },
  // Extraction.
  { buildingTypeId: "drainage_pump", effectType: "output_pct", magnitude: 15, note: "Dewatered workings can be driven deeper." },
  { buildingTypeId: "winding_gear", effectType: "output_pct", magnitude: 12, note: "More hauled from greater depth." },
  { buildingTypeId: "ore_washery", effectType: "output_pct", magnitude: 8, note: "More good stuff recovered from the spoil." },
];

// --- Building outputs (per-building daily production) ---------------------
// A district flagged outputFromBuildings produces the SUM of its buildings'
// outputs (× tier × density dividend), so more/better buildings = more goods.
// resourceId null + outputKind 'coin' means a trade margin in coin, not a good.

export const buildingOutputsCatalogue = [
  // Smithy / foundry.
  { buildingTypeId: "forge_building", resourceId: "R:Iron_Ingot", dailyAmount: 1, outputKind: "primary" },
  { buildingTypeId: "forge_building", resourceId: "R:Slag", dailyAmount: 1, outputKind: "byproduct" },
  { buildingTypeId: "blast_furnace", resourceId: "R:Steel", dailyAmount: 1, outputKind: "primary" },
  { buildingTypeId: "blast_furnace", resourceId: "R:Slag", dailyAmount: 1, outputKind: "byproduct" },
  // Bakery.
  { buildingTypeId: "bakehouse", resourceId: "R:Bread", dailyAmount: 4, outputKind: "primary" },
  { buildingTypeId: "great_bakehouse", resourceId: "R:Bread", dailyAmount: 8, outputKind: "primary" },
  // New chains.
  { buildingTypeId: "loom", resourceId: "R:Cloth", dailyAmount: 2, outputKind: "primary" },
  { buildingTypeId: "tan_pit", resourceId: "R:Leather", dailyAmount: 2, outputKind: "primary" },
  { buildingTypeId: "saw_frame", resourceId: "R:Planks", dailyAmount: 3, outputKind: "primary" },
  { buildingTypeId: "fletching_bench", resourceId: "R:Arrows", dailyAmount: 4, outputKind: "primary" },
  { buildingTypeId: "brewing_vat", resourceId: "R:Ale", dailyAmount: 3, outputKind: "primary" },
  { buildingTypeId: "kiln", resourceId: "R:Brick", dailyAmount: 3, outputKind: "primary" },
  { buildingTypeId: "glass_furnace", resourceId: "R:Glass", dailyAmount: 2, outputKind: "primary" },
  { buildingTypeId: "jewellers_bench", resourceId: "R:Jewellery", dailyAmount: 1, outputKind: "primary" },
  // Coin (trade margin).
  { buildingTypeId: "mint_press", resourceId: null, dailyAmount: 8, outputKind: "coin" },
  { buildingTypeId: "warehouse", resourceId: null, dailyAmount: 6, outputKind: "coin" },
  { buildingTypeId: "loading_dock", resourceId: null, dailyAmount: 4, outputKind: "coin" },
];

// --- Building tags (verifiable themes) -----------------------------------

// NOTE: every category:'residential' building is auto-tagged
// 'theme:residential' by the seed loop, so the housing quarters' themed
// slot is satisfied without listing each house here.
export const buildingTagsCatalogue = [
  { buildingTypeId: "longhouse", tag: "theme:communal" },
  { buildingTypeId: "guild_lodging", tag: "theme:communal" },
  { buildingTypeId: "cloister_cell", tag: "theme:communal" },
  { buildingTypeId: "bakehouse", tag: "theme:bakery" },
  { buildingTypeId: "great_bakehouse", tag: "theme:bakery" },
  { buildingTypeId: "flour_mill", tag: "theme:bakery" },
  { buildingTypeId: "watermill", tag: "theme:bakery" },
  { buildingTypeId: "granary", tag: "theme:agrarian" },
  { buildingTypeId: "forge_building", tag: "theme:industrial" },
  { buildingTypeId: "anvil_shed", tag: "theme:industrial" },
  { buildingTypeId: "tower_armoury", tag: "theme:martial" },
  { buildingTypeId: "bunkhouse", tag: "theme:martial" },
  { buildingTypeId: "watchpost", tag: "theme:martial" },
  { buildingTypeId: "stable_block", tag: "theme:equine" },
  { buildingTypeId: "scriptorium", tag: "theme:scholarly" },
  { buildingTypeId: "captains_hall", tag: "theme:civic" },
  { buildingTypeId: "hearth_hall", tag: "theme:civic" },
  { buildingTypeId: "market_stalls", tag: "theme:mercantile" },
  { buildingTypeId: "flour_mill", tag: "mill" },
  { buildingTypeId: "watermill", tag: "mill" },
  { buildingTypeId: "blast_furnace", tag: "theme:industrial" },
  { buildingTypeId: "loom", tag: "theme:industrial" },
  { buildingTypeId: "tan_pit", tag: "theme:industrial" },
  { buildingTypeId: "saw_frame", tag: "theme:industrial" },
  { buildingTypeId: "brewing_vat", tag: "theme:industrial" },
  { buildingTypeId: "kiln", tag: "theme:industrial" },
  { buildingTypeId: "glass_furnace", tag: "theme:industrial" },
  { buildingTypeId: "fletching_bench", tag: "theme:martial" },
  { buildingTypeId: "jewellers_bench", tag: "theme:luxury" },
  { buildingTypeId: "mint_press", tag: "theme:luxury" },
  { buildingTypeId: "warehouse", tag: "theme:mercantile" },
  { buildingTypeId: "loading_dock", tag: "theme:mercantile" },
  // Support buildings — accepted by any production district's optional
  // upgrade slot (themeTag support:industrial).
  { buildingTypeId: "foremans_office", tag: "support:industrial" },
  { buildingTypeId: "masters_workshop", tag: "support:industrial" },
  { buildingTypeId: "water_wheel", tag: "support:industrial" },
  { buildingTypeId: "goods_store", tag: "support:industrial" },
  { buildingTypeId: "materials_store", tag: "support:industrial" },
  { buildingTypeId: "counting_room", tag: "support:industrial" },
  // Extraction upgrades.
  { buildingTypeId: "drainage_pump", tag: "support:extraction" },
  { buildingTypeId: "winding_gear", tag: "support:extraction" },
  { buildingTypeId: "ore_washery", tag: "support:extraction" },
];

// --- District required buildings ------------------------------------------
// kind 'specific' names an exact building; 'themed' wants N matching a
// theme (buildingTypeId null, themeNote set).

export type RequiredBuildingSeed = {
  districtTypeId: string;
  kind: string;
  buildingTypeId: string | null;
  count: number;
  /** Upper bound of the slot. Omit for a fixed requirement (= count). */
  maxCount?: number;
  themeNote: string | null;
  themeTag?: string;
  groupKey?: string;
  /** Optional upgrade slot — buildings the player MAY add, not required. */
  optional?: boolean;
};

// Every output-from-buildings (industrial) district accepts an optional
// "workshop upgrades" slot: up to 3 support buildings (support:industrial),
// each buffing the district. Generated to avoid one row per district.
const UPGRADEABLE_DISTRICTS = [
  "bakery", "smithy", "foundry", "sawmill", "tannery", "weavers_mill",
  "brewery", "kiln_yard", "fletcher", "glassworks", "mint", "jeweller",
  "trade_warehouse",
];
const districtUpgradeSlots: RequiredBuildingSeed[] = UPGRADEABLE_DISTRICTS.map(
  (districtTypeId) => ({
    districtTypeId,
    kind: "themed",
    buildingTypeId: null,
    count: 0,
    maxCount: 3,
    themeNote: "workshop upgrades",
    themeTag: "support:industrial",
    optional: true,
  }),
);

// Extraction archetypes: a ranged output-building slot + an optional
// support:extraction upgrade slot (drainage, winding gear, ore-washery).
const EXTRACTION_OUTPUT: Record<string, { building: string; max: number }> = {
  mine: { building: "mine_shaft", max: 3 },
  deep_mine: { building: "mine_shaft", max: 6 },
  quarry: { building: "quarry_face", max: 4 },
  forestry_camp: { building: "logging_stand", max: 4 },
};
const extractionSlots: RequiredBuildingSeed[] = Object.entries(EXTRACTION_OUTPUT).flatMap(
  ([districtTypeId, { building, max }]) => [
    { districtTypeId, kind: "specific", buildingTypeId: building, count: 1, maxCount: max, themeNote: null },
    { districtTypeId, kind: "themed", buildingTypeId: null, count: 0, maxCount: 3, themeNote: "mine upgrades", themeTag: "support:extraction", optional: true },
  ],
);

export const districtRequiredBuildingsCatalogue: RequiredBuildingSeed[] = [
  { districtTypeId: "wheat_farm", kind: "specific", buildingTypeId: "granary", count: 1, themeNote: null },
  // A bakery's mill slot accepts EITHER a wind Flour Mill OR a Watermill.
  // Output districts: the OUTPUT building is the ranged slot (count..maxCount,
  // each one adds to the daily yield); fixed co-buildings just gate it.
  { districtTypeId: "bakery", kind: "specific", buildingTypeId: "flour_mill", count: 1, themeNote: null, groupKey: "mill" },
  { districtTypeId: "bakery", kind: "specific", buildingTypeId: "watermill", count: 1, themeNote: null, groupKey: "mill" },
  { districtTypeId: "bakery", kind: "specific", buildingTypeId: "bakehouse", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "smithy", kind: "specific", buildingTypeId: "forge_building", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "smithy", kind: "specific", buildingTypeId: "anvil_shed", count: 1, themeNote: null },
  { districtTypeId: "foundry", kind: "specific", buildingTypeId: "blast_furnace", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "foundry", kind: "specific", buildingTypeId: "anvil_shed", count: 1, themeNote: null },
  { districtTypeId: "sawmill", kind: "specific", buildingTypeId: "saw_frame", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "tannery", kind: "specific", buildingTypeId: "tan_pit", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "weavers_mill", kind: "specific", buildingTypeId: "loom", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "brewery", kind: "specific", buildingTypeId: "brewing_vat", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "kiln_yard", kind: "specific", buildingTypeId: "kiln", count: 1, maxCount: 3, themeNote: null },
  { districtTypeId: "fletcher", kind: "specific", buildingTypeId: "fletching_bench", count: 1, maxCount: 2, themeNote: null },
  { districtTypeId: "glassworks", kind: "specific", buildingTypeId: "glass_furnace", count: 1, maxCount: 2, themeNote: null },
  { districtTypeId: "mint", kind: "specific", buildingTypeId: "mint_press", count: 1, maxCount: 2, themeNote: null },
  { districtTypeId: "jeweller", kind: "specific", buildingTypeId: "jewellers_bench", count: 1, maxCount: 2, themeNote: null },
  { districtTypeId: "trade_warehouse", kind: "specific", buildingTypeId: "warehouse", count: 1, maxCount: 4, themeNote: null },
  { districtTypeId: "barracks", kind: "specific", buildingTypeId: "bunkhouse", count: 2, themeNote: null },
  { districtTypeId: "barracks", kind: "specific", buildingTypeId: "tower_armoury", count: 1, themeNote: null },
  { districtTypeId: "stables", kind: "specific", buildingTypeId: "stable_block", count: 2, maxCount: 4, themeNote: null },
  { districtTypeId: "swan_knight_hall", kind: "specific", buildingTypeId: "stable_block", count: 2, themeNote: null },
  { districtTypeId: "swan_knight_hall", kind: "specific", buildingTypeId: "captains_hall", count: 1, themeNote: null },
  { districtTypeId: "great_hall", kind: "specific", buildingTypeId: "captains_hall", count: 1, themeNote: null },
  { districtTypeId: "great_hall", kind: "specific", buildingTypeId: "hearth_hall", count: 1, themeNote: null },
  { districtTypeId: "library", kind: "specific", buildingTypeId: "scriptorium", count: 2, themeNote: null },
  { districtTypeId: "market", kind: "specific", buildingTypeId: "market_stalls", count: 2, maxCount: 5, themeNote: null },
  { districtTypeId: "healing_house", kind: "specific", buildingTypeId: "healing_ward", count: 2, themeNote: null },
  { districtTypeId: "healing_house", kind: "specific", buildingTypeId: "well_house", count: 1, themeNote: null },
  { districtTypeId: "watchtower", kind: "specific", buildingTypeId: "watchpost", count: 1, themeNote: null },
  { districtTypeId: "tavern", kind: "specific", buildingTypeId: "hearth_hall", count: 1, themeNote: null },

  // Residential quarters require N housing buildings (theme:residential). The
  // class ceiling (district populationClass vs each building's housingClass)
  // is enforced separately, so the player is free to fill the slots with any
  // housing of the quarter's class or lower.
  { districtTypeId: "crofters_holding", kind: "themed", buildingTypeId: null, count: 2, maxCount: 4, themeNote: "peasant housing", themeTag: "theme:residential" },
  { districtTypeId: "cottage_quarter", kind: "themed", buildingTypeId: null, count: 3, maxCount: 8, themeNote: "peasant housing", themeTag: "theme:residential" },
  { districtTypeId: "fishing_village", kind: "themed", buildingTypeId: null, count: 3, maxCount: 6, themeNote: "peasant housing", themeTag: "theme:residential" },
  { districtTypeId: "longhouse_steading", kind: "themed", buildingTypeId: null, count: 2, maxCount: 5, themeNote: "communal housing", themeTag: "theme:residential" },
  { districtTypeId: "common_quarter", kind: "themed", buildingTypeId: null, count: 4, maxCount: 12, themeNote: "peasant housing", themeTag: "theme:residential" },
  { districtTypeId: "artisans_quarter", kind: "themed", buildingTypeId: null, count: 3, maxCount: 6, themeNote: "artisan housing", themeTag: "theme:residential" },
  { districtTypeId: "craft_lane", kind: "themed", buildingTypeId: null, count: 4, maxCount: 9, themeNote: "artisan housing", themeTag: "theme:residential" },
  { districtTypeId: "merchants_row", kind: "themed", buildingTypeId: null, count: 3, maxCount: 6, themeNote: "merchant housing", themeTag: "theme:residential" },
  { districtTypeId: "counting_quarter", kind: "themed", buildingTypeId: null, count: 3, maxCount: 7, themeNote: "merchant housing", themeTag: "theme:residential" },
  { districtTypeId: "scholars_close", kind: "themed", buildingTypeId: null, count: 3, maxCount: 6, themeNote: "scholar housing", themeTag: "theme:residential" },
  { districtTypeId: "cloister", kind: "themed", buildingTypeId: null, count: 2, maxCount: 6, themeNote: "scholar housing", themeTag: "theme:residential" },
  { districtTypeId: "noble_estate", kind: "themed", buildingTypeId: null, count: 2, maxCount: 5, themeNote: "housing (manor + servants)", themeTag: "theme:residential" },
  { districtTypeId: "high_quarter", kind: "themed", buildingTypeId: null, count: 3, maxCount: 6, themeNote: "noble housing", themeTag: "theme:residential" },

  // Optional workshop-upgrade slots on every industrial district.
  ...districtUpgradeSlots,
  // Extraction archetypes: output building + optional upgrade slot.
  ...extractionSlots,
];

// --- District scale bonuses ("build big" reward) -------------------------
// For each building raised beyond a district's MINIMUM (up to its max), the
// district earns this bonus. So one large quarter beats several small ones
// per capita — on top of paying a single commission + upkeep instead of many.
// perBuilding is a percentage (or flat, for 'prestige').

export const districtScaleBonusesCatalogue = [
  // Peasant — modest density dividend.
  { districtTypeId: "crofters_holding", bonusType: "tax_yield_pct", perBuilding: 2, note: "More holdings worked, more to tithe." },
  { districtTypeId: "cottage_quarter", bonusType: "tax_yield_pct", perBuilding: 2, note: "A fuller lane pays more in poll-tax." },
  { districtTypeId: "fishing_village", bonusType: "output_pct", perBuilding: 3, note: "More boats, a bigger catch landed." },
  { districtTypeId: "longhouse_steading", bonusType: "tax_yield_pct", perBuilding: 2, note: "A larger steading musters more in render." },
  { districtTypeId: "common_quarter", bonusType: "tax_yield_pct", perBuilding: 2, note: "City density concentrates taxable trade." },
  { districtTypeId: "common_quarter", bonusType: "upkeep_reduction_pct", perBuilding: 2, note: "Shared wells and lanes spread the upkeep." },
  // Artisan — economies of the workshop.
  { districtTypeId: "artisans_quarter", bonusType: "output_pct", perBuilding: 3, note: "Shared tools and apprentices lift every shop." },
  { districtTypeId: "artisans_quarter", bonusType: "tax_yield_pct", perBuilding: 2, note: "" },
  { districtTypeId: "craft_lane", bonusType: "output_pct", perBuilding: 3, note: "A whole street of crafts feeds off itself." },
  // Merchant — the wealthiest density dividend.
  { districtTypeId: "merchants_row", bonusType: "tax_yield_pct", perBuilding: 4, note: "Clustered counting-houses move more coin." },
  { districtTypeId: "counting_quarter", bonusType: "tax_yield_pct", perBuilding: 4, note: "The great houses set the city's prices." },
  { districtTypeId: "counting_quarter", bonusType: "upkeep_reduction_pct", perBuilding: 2, note: "" },
  // Scholar — a fuller precinct generates more Diplomacy.
  { districtTypeId: "scholars_close", bonusType: "dp_yield_pct", perBuilding: 3, note: "More lettered hands, more counsel sent abroad." },
  { districtTypeId: "cloister", bonusType: "dp_yield_pct", perBuilding: 4, note: "A great order's voice carries far." },
  // Noble — standing, and the tax of the rich.
  { districtTypeId: "noble_estate", bonusType: "prestige", perBuilding: 1, note: "A grander seat lends the settlement standing." },
  { districtTypeId: "noble_estate", bonusType: "tax_yield_pct", perBuilding: 3, note: "" },
  { districtTypeId: "high_quarter", bonusType: "prestige", perBuilding: 1, note: "A crowded high quarter overawes rivals." },
  { districtTypeId: "high_quarter", bonusType: "tax_yield_pct", perBuilding: 4, note: "" },
  // A couple of non-residential examples (the mechanic is general).
  { districtTypeId: "market", bonusType: "tax_yield_pct", perBuilding: 3, note: "More stalls, more tolls at the weigh-house." },
  { districtTypeId: "stables", bonusType: "output_pct", perBuilding: 4, note: "A larger yard breaks more mounts at once." },
  // Industrial districts: a fuller workshop is more than the sum of its
  // benches — shared tools, banked fires, and apprentices lift every unit.
  { districtTypeId: "smithy", bonusType: "output_pct", perBuilding: 4, note: "Banked fires and shared stock between the forges." },
  { districtTypeId: "foundry", bonusType: "output_pct", perBuilding: 4, note: "" },
  { districtTypeId: "weavers_mill", bonusType: "output_pct", perBuilding: 3, note: "" },
  { districtTypeId: "tannery", bonusType: "output_pct", perBuilding: 3, note: "" },
  { districtTypeId: "sawmill", bonusType: "output_pct", perBuilding: 3, note: "" },
  { districtTypeId: "brewery", bonusType: "output_pct", perBuilding: 3, note: "" },
  { districtTypeId: "kiln_yard", bonusType: "output_pct", perBuilding: 3, note: "" },
  { districtTypeId: "glassworks", bonusType: "output_pct", perBuilding: 4, note: "" },
  { districtTypeId: "bakery", bonusType: "output_pct", perBuilding: 3, note: "Shared ovens hold their heat between bakes." },
  { districtTypeId: "trade_warehouse", bonusType: "output_pct", perBuilding: 3, note: "A bigger depot turns goods faster." },
];

// --- District required components -----------------------------------------

export const districtRequiredComponentsCatalogue = [
  // Residential quarters: beds come from the housing buildings (cap is
  // summed from them), so the quarter only adds shared amenities. Denser /
  // larger quarters need a public well; estates a hearth-hall table.
  { districtTypeId: "cottage_quarter", componentId: "WELL", count: 1, perCap: false },
  { districtTypeId: "common_quarter", componentId: "WELL", count: 2, perCap: false },
  { districtTypeId: "artisans_quarter", componentId: "WELL", count: 1, perCap: false },
  { districtTypeId: "craft_lane", componentId: "WELL", count: 1, perCap: false },
  { districtTypeId: "merchants_row", componentId: "WELL", count: 1, perCap: false },
  { districtTypeId: "counting_quarter", componentId: "WELL", count: 1, perCap: false },
  // Production / functional districts.
  { districtTypeId: "wheat_farm", componentId: "STORAGE", count: 1, perCap: false },
  { districtTypeId: "bakery", componentId: "COOKING", count: 1, perCap: false },
  { districtTypeId: "bakery", componentId: "STORAGE", count: 1, perCap: false },
  { districtTypeId: "smithy", componentId: "ANVIL", count: 1, perCap: false },
  { districtTypeId: "smithy", componentId: "FORGE", count: 1, perCap: false },
  { districtTypeId: "smithy", componentId: "STORAGE", count: 1, perCap: false },
  { districtTypeId: "foundry", componentId: "FORGE", count: 2, perCap: false },
  { districtTypeId: "foundry", componentId: "STORAGE", count: 1, perCap: false },
  { districtTypeId: "barracks", componentId: "BED", count: 5, perCap: false },
  { districtTypeId: "barracks", componentId: "ARROW_RACK", count: 1, perCap: false },
  { districtTypeId: "stables", componentId: "STABLE_STALL", count: 4, perCap: false },
  { districtTypeId: "great_hall", componentId: "TABLE", count: 1, perCap: false },
  { districtTypeId: "great_hall", componentId: "BANNER", count: 1, perCap: false },
  { districtTypeId: "library", componentId: "LECTERN", count: 2, perCap: false },
  { districtTypeId: "library", componentId: "STORAGE", count: 1, perCap: false },
  { districtTypeId: "market", componentId: "TABLE", count: 2, perCap: false },
  { districtTypeId: "healing_house", componentId: "BED", count: 4, perCap: false },
  { districtTypeId: "healing_house", componentId: "HEARTH", count: 1, perCap: false },
  { districtTypeId: "healing_house", componentId: "WELL", count: 1, perCap: false },
  { districtTypeId: "tavern", componentId: "HEARTH", count: 1, perCap: false },
  { districtTypeId: "tavern", componentId: "TABLE", count: 2, perCap: false },
];

// --- District footprint / height / decoration overrides ------------------
// Applied as an UPDATE pass in the seed (kept out of the main district
// catalogue to avoid bloating every entry).

export const districtFootprintCatalogue = [
  // Residential quarters are large plots holding several housing buildings.
  { id: "crofters_holding", minFootprintBlocks: 200, maxFootprintBlocks: 900, minHeightBlocks: 3 },
  { id: "cottage_quarter", minFootprintBlocks: 150, maxFootprintBlocks: 600, minHeightBlocks: 4 },
  { id: "fishing_village", minFootprintBlocks: 150, maxFootprintBlocks: 600, minHeightBlocks: 4 },
  { id: "longhouse_steading", minFootprintBlocks: 200, maxFootprintBlocks: 700, minHeightBlocks: 5 },
  { id: "common_quarter", minFootprintBlocks: 150, maxFootprintBlocks: 500, minHeightBlocks: 12 },
  { id: "artisans_quarter", minFootprintBlocks: 150, maxFootprintBlocks: 500, minHeightBlocks: 5 },
  { id: "craft_lane", minFootprintBlocks: 150, maxFootprintBlocks: 500, minHeightBlocks: 6 },
  { id: "merchants_row", minFootprintBlocks: 150, maxFootprintBlocks: 500, minHeightBlocks: 8 },
  { id: "counting_quarter", minFootprintBlocks: 150, maxFootprintBlocks: 500, minHeightBlocks: 9 },
  { id: "scholars_close", minFootprintBlocks: 150, maxFootprintBlocks: 450, minHeightBlocks: 5 },
  { id: "cloister", minFootprintBlocks: 200, maxFootprintBlocks: 600, minHeightBlocks: 6 },
  { id: "noble_estate", minFootprintBlocks: 300, maxFootprintBlocks: 900, minHeightBlocks: 8 },
  { id: "high_quarter", minFootprintBlocks: 250, maxFootprintBlocks: 800, minHeightBlocks: 9 },
  { id: "bakery", minFootprintBlocks: 49, maxFootprintBlocks: 200, minHeightBlocks: 5 },
  { id: "smithy", minFootprintBlocks: 64, maxFootprintBlocks: 256, minHeightBlocks: 5 },
  { id: "foundry", minFootprintBlocks: 100, maxFootprintBlocks: 400, minHeightBlocks: 8 },
  { id: "great_hall", minFootprintBlocks: 100, maxFootprintBlocks: 500, minHeightBlocks: 8 },
  { id: "library", minFootprintBlocks: 100, maxFootprintBlocks: 400, minHeightBlocks: 7, decorationThreshold: 75 },
  { id: "watchtower", minFootprintBlocks: 25, maxFootprintBlocks: 100, minHeightBlocks: 15 },
  { id: "capital_walls", decorationThreshold: 90 },
  { id: "citadel_walls", decorationThreshold: 85 },
];

// --- Decoration scoring criteria (mod_spec §7.5) -------------------------

export const decorationCriteriaCatalogue = [
  { id: "block_variety", displayName: "Block Variety", weightPct: 15, description: "Distinct block types used across walls, floors, and detailing." },
  { id: "light_density", displayName: "Light Density", weightPct: 10, description: "Light sources per unit of habitable area." },
  { id: "vertical_interest", displayName: "Vertical Interest", weightPct: 15, description: "Roof complexity, multi-level features, variation in height." },
  { id: "decoration_density", displayName: "Decoration Density", weightPct: 20, description: "Non-structural blocks: banners, pots, books, flowers, and the like." },
  { id: "theme_adherence", displayName: "Theme Adherence", weightPct: 15, description: "Block palette matches the faction's approved themed sets." },
  { id: "furnishing_completeness", displayName: "Furnishing Completeness", weightPct: 10, description: "Required functional components present, plus extras." },
  { id: "scale_appropriateness", displayName: "Scale Appropriateness", weightPct: 10, description: "Building size matches purpose — no 10×10 manors, no 50×50 hovels." },
  { id: "material_quality", displayName: "Material Quality", weightPct: 5, description: "Use of mid- and high-tier blocks over all-dirt-and-cobble." },
];

// --- Tier decoration thresholds (mod_spec §7.5) -------------------------

export const tierDecorationThresholdsCatalogue = [
  { tier: "hamlet", minScore: 50, reviewMode: "light", note: "Auto-approve at 50+, else a light staff look." },
  { tier: "steading", minScore: 50, reviewMode: "light", note: "Auto-approve at 50+, else a light staff look." },
  { tier: "village", minScore: 65, reviewMode: "light", note: "Auto-approve at 65+, else a light staff look." },
  { tier: "burgh", minScore: 65, reviewMode: "light", note: "Auto-approve at 65+, else a light staff look." },
  { tier: "town", minScore: 75, reviewMode: "spot", note: "Auto-approve at 75+ with a precise plan; otherwise staff spot-check." },
  { tier: "city", minScore: 85, reviewMode: "spot", note: "Always staff spot-checked, even at high scores." },
  { tier: "great_city", minScore: null, reviewMode: "full", note: "Always full staff review; score is informational." },
  { tier: "capital", minScore: null, reviewMode: "full", note: "Always full staff review; score is informational." },
];

// --- Cultures (architectural styles) -------------------------------------
// Cosmetic only: cultures change a building's NAME, flavour, and approved
// block palette — never its components or district role. parentCultureId
// groups sub-styles (silvan + noldorin under an elven parent).

export const culturesCatalogue = [
  { id: "gondorian", displayName: "Gondorian", parentCultureId: null, description: "Númenórean stonework — white ashlar, black marble, vaulted arches and tall towers. The high style of Minas Tirith and Dol Amroth." },
  { id: "rohirric", displayName: "Rohirric", parentCultureId: null, description: "Timber and thatch golden halls of the horse-lords, carved with running horses and sun-discs. Meduseld is its summit." },
  { id: "dwarven", displayName: "Dwarven", parentCultureId: null, description: "Geometric carved stone, deep halls and pillared galleries. Erebor and the Iron Hills build under the mountain, in granite and gold." },
  { id: "elven", displayName: "Elven", parentCultureId: null, description: "The graceful umbrella of the Eldar — flowing organic forms, white and silver, woven into the living land." },
  { id: "silvan", displayName: "Silvan (Galadhrim)", parentCultureId: "elven", description: "The wood-elves of Lórien build aloft in the mallorn-boughs — flets and talans of silver bark and golden leaf, touching the ground lightly." },
  { id: "noldorin", displayName: "Noldorin (Imladris)", parentCultureId: "elven", description: "Rivendell's high-elven style — slender bridges, fluted columns, copper roofs and waterfalls. Stone made to look weightless." },
  { id: "hobbit", displayName: "Hobbit (Shire)", parentCultureId: null, description: "Round green doors and turf-roofed smials dug into the hillside. Cosy, low, and unfailingly domestic." },
  { id: "dalish", displayName: "Dalish", parentCultureId: null, description: "The Men of Dale and Esgaroth — bright timber-framed market towns, steep gables, painted shutters and bunting." },
  { id: "dunlending", displayName: "Dunlending", parentCultureId: null, description: "The wild hill-folk — rough drystone and hide, round huts and stockades, smoke and red ochre." },
  { id: "haradrim", displayName: "Haradrim", parentCultureId: null, description: "The south — sun-baked mudbrick, sandstone, domes and awnings, serpent-and-sun heraldry." },
  { id: "easterling", displayName: "Easterling", parentCultureId: null, description: "Rhûn — lacquered timber, tiered roofs, bronze and dark wood, the banners of the wainriders." },
  { id: "mordor", displayName: "Mordor (Orcish)", parentCultureId: null, description: "Black iron and basalt, jagged and brutal. Built to intimidate, not to please." },
  { id: "isengard", displayName: "Isengard (Uruk)", parentCultureId: null, description: "Saruman's industry — iron wheels and furnaces sunk into the ring of Orthanc. A mind of metal and wheels." },
];

// --- Culture palettes (approved blocks per role — for theme_adherence) ---

export const culturePalettesCatalogue = [
  // Gondorian — white stone, black marble.
  { cultureId: "gondorian", role: "wall", blocks: ["minecraft:smooth_quartz", "minecraft:diorite", "minecraft:calcite"], note: "White ashlar." },
  { cultureId: "gondorian", role: "roof", blocks: ["minecraft:deepslate_tiles", "minecraft:polished_blackstone"], note: "Dark slate." },
  { cultureId: "gondorian", role: "accent", blocks: ["minecraft:polished_blackstone", "minecraft:gold_block"], note: "Black marble and gilding." },
  { cultureId: "gondorian", role: "foundation", blocks: ["minecraft:stone_bricks", "minecraft:chiseled_stone_bricks"], note: "Dressed stone." },
  // Rohirric — timber + thatch.
  { cultureId: "rohirric", role: "wall", blocks: ["minecraft:spruce_planks", "minecraft:white_terracotta", "minecraft:stripped_oak_log"], note: "Daub between timber frame." },
  { cultureId: "rohirric", role: "roof", blocks: ["minecraft:wheat", "minecraft:hay_block", "minecraft:thatch"], note: "Thatch." },
  { cultureId: "rohirric", role: "accent", blocks: ["minecraft:gold_block", "minecraft:spruce_log"], note: "Carved horse-heads, gold ridge." },
  // Dwarven — granite + gold geometry.
  { cultureId: "dwarven", role: "wall", blocks: ["minecraft:polished_granite", "minecraft:polished_andesite", "minecraft:stone_bricks"], note: "Squared granite." },
  { cultureId: "dwarven", role: "accent", blocks: ["minecraft:gold_block", "minecraft:copper_block", "minecraft:chiseled_stone_bricks"], note: "Gold inlay, geometric." },
  { cultureId: "dwarven", role: "foundation", blocks: ["minecraft:deepslate_bricks", "minecraft:polished_deepslate"], note: "Deep stone." },
  // Silvan — mallorn boughs.
  { cultureId: "silvan", role: "wall", blocks: ["minecraft:birch_planks", "minecraft:stripped_birch_log"], note: "Silver mallorn bark." },
  { cultureId: "silvan", role: "roof", blocks: ["minecraft:azalea_leaves", "minecraft:flowering_azalea_leaves", "minecraft:oak_leaves"], note: "Living golden canopy." },
  { cultureId: "silvan", role: "accent", blocks: ["minecraft:lantern", "minecraft:gold_block"], note: "Soft lamps in the boughs." },
  // Noldorin — weightless stone + copper.
  { cultureId: "noldorin", role: "wall", blocks: ["minecraft:smooth_quartz", "minecraft:diorite", "minecraft:white_terracotta"], note: "Pale fluted stone." },
  { cultureId: "noldorin", role: "roof", blocks: ["minecraft:oxidized_copper", "minecraft:weathered_copper"], note: "Verdigris copper." },
  // Hobbit — turf + round doors.
  { cultureId: "hobbit", role: "wall", blocks: ["minecraft:mud_bricks", "minecraft:oak_planks", "minecraft:stripped_oak_log"], note: "Plaster and timber." },
  { cultureId: "hobbit", role: "roof", blocks: ["minecraft:grass_block", "minecraft:moss_block", "minecraft:rooted_dirt"], note: "Turf roof." },
  // Dalish — bright timber market town.
  { cultureId: "dalish", role: "wall", blocks: ["minecraft:oak_planks", "minecraft:white_terracotta", "minecraft:dark_oak_log"], note: "Timber-frame." },
  { cultureId: "dalish", role: "roof", blocks: ["minecraft:red_terracotta", "minecraft:granite"], note: "Red clay tile." },
  // Dunlending — drystone + hide.
  { cultureId: "dunlending", role: "wall", blocks: ["minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:coarse_dirt"], note: "Drystone and daub." },
  { cultureId: "dunlending", role: "roof", blocks: ["minecraft:hay_block", "minecraft:brown_wool"], note: "Thatch and hide." },
  // Haradrim — mudbrick + sandstone.
  { cultureId: "haradrim", role: "wall", blocks: ["minecraft:smooth_sandstone", "minecraft:cut_sandstone", "minecraft:terracotta"], note: "Sun-baked brick." },
  { cultureId: "haradrim", role: "roof", blocks: ["minecraft:smooth_sandstone", "minecraft:orange_terracotta"], note: "Flat sand roofs and domes." },
  // Easterling — lacquered tiered timber.
  { cultureId: "easterling", role: "wall", blocks: ["minecraft:dark_oak_planks", "minecraft:red_terracotta"], note: "Lacquered dark wood." },
  { cultureId: "easterling", role: "roof", blocks: ["minecraft:warped_planks", "minecraft:cyan_terracotta"], note: "Tiered jade tile." },
  // Mordor — black iron + basalt.
  { cultureId: "mordor", role: "wall", blocks: ["minecraft:blackstone", "minecraft:polished_blackstone", "minecraft:basalt"], note: "Black basalt." },
  { cultureId: "mordor", role: "accent", blocks: ["minecraft:netherite_block", "minecraft:iron_bars", "minecraft:crying_obsidian"], note: "Iron and dread." },
  // Isengard — iron and furnace.
  { cultureId: "isengard", role: "wall", blocks: ["minecraft:polished_deepslate", "minecraft:cobbled_deepslate", "minecraft:iron_block"], note: "Iron-bound deep stone." },
  { cultureId: "isengard", role: "accent", blocks: ["minecraft:furnace", "minecraft:iron_block", "minecraft:lava"], note: "Furnace-pits and wheels." },
];

// --- Building variants (the cosmetic reskin per culture) -----------------
// Same functional building; culture-specific name, flavour and palette.

export const buildingVariantsCatalogue = [
  // Cottage — the common home.
  { buildingTypeId: "cottage", cultureId: "hobbit", variantName: "Smial", description: "A round green door set in a grassy bank, snug rooms burrowed back into the hill.", paletteNote: "Plaster and oak, turf roof, round door." },
  { buildingTypeId: "cottage", cultureId: "rohirric", variantName: "Cot", description: "A low timber-framed cot with a steep thatched roof and a horse-head gable.", paletteNote: "Spruce frame, thatch, carved gable." },
  { buildingTypeId: "cottage", cultureId: "gondorian", variantName: "Stone Cottage", description: "A neat ashlar cottage with a slate roof and shuttered windows.", paletteNote: "Stone brick, slate roof." },
  // House.
  { buildingTypeId: "house", cultureId: "dalish", variantName: "Gable House", description: "A bright timber-framed house with painted shutters and a steep tiled gable.", paletteNote: "Oak frame, red tile, painted shutters." },
  // Town House.
  { buildingTypeId: "townhouse", cultureId: "gondorian", variantName: "Ashlar Townhouse", description: "A tall narrow stone townhouse rising four storeys off a cramped frontage.", paletteNote: "White ashlar, slate, iron balconies." },
  // Tenement.
  { buildingTypeId: "tenement", cultureId: "gondorian", variantName: "Insula", description: "A stacked stone tenement around a shared light-well and stair.", paletteNote: "Stone brick, slate, shared courtyard." },
  // Manor House.
  { buildingTypeId: "manor_house", cultureId: "gondorian", variantName: "Stone Manor", description: "A walled ashlar manor with a gatehouse, garden court, and servants' wing.", paletteNote: "White ashlar, black marble, gardens." },
  // Longhouse.
  { buildingTypeId: "longhouse", cultureId: "rohirric", variantName: "Kin-Hall", description: "A turf-banked timber longhouse sheltering a whole household and its beasts at the byre end.", paletteNote: "Spruce, thatch, turf banking." },
  { buildingTypeId: "longhouse", cultureId: "dunlending", variantName: "Clan Longhouse", description: "A drystone-and-hide longhouse, smoke-blackened, hung with clan tokens.", paletteNote: "Cobble and hide, hay roof." },

  // Hearth Hall — the gathering hall.
  { buildingTypeId: "hearth_hall", cultureId: "rohirric", variantName: "Mead Hall", description: "A golden timber hall, benches down both walls, a long fire-pit at the centre. Meduseld in miniature.", paletteNote: "Spruce frame, thatch roof, carved horse-head gables." },
  { buildingTypeId: "hearth_hall", cultureId: "gondorian", variantName: "Stone Feast-Hall", description: "A vaulted ashlar hall with a raised dais and tall narrow windows.", paletteNote: "White ashlar walls, dark slate roof, black marble floor." },
  { buildingTypeId: "hearth_hall", cultureId: "dwarven", variantName: "Deep Hearth-Hall", description: "A pillared gallery cut from living granite around a forge-bright hearth.", paletteNote: "Polished granite, gold inlay, deepslate floor." },
  { buildingTypeId: "hearth_hall", cultureId: "hobbit", variantName: "Common Room", description: "A low, snug room with a great fireplace, settles, and a well-stocked larder door.", paletteNote: "Plaster and oak, turf overhead." },
  // Captain's Hall — the seat of authority.
  { buildingTypeId: "captains_hall", cultureId: "gondorian", variantName: "Steward's Hall", description: "A pillared audience hall beneath a banner of the White Tree.", paletteNote: "White ashlar, black-and-silver heraldry." },
  { buildingTypeId: "captains_hall", cultureId: "rohirric", variantName: "Marshal's Hall", description: "The seat of a Marshal of the Mark, hung with horse-tail standards.", paletteNote: "Timber and gold, green hangings." },
  { buildingTypeId: "captains_hall", cultureId: "dwarven", variantName: "Lord's Gallery", description: "A throne-gallery of carved stone kings beneath the mountain.", paletteNote: "Granite and gold, axe-and-anvil device." },
  // Bunkhouse — soldiers' quarters.
  { buildingTypeId: "bunkhouse", cultureId: "gondorian", variantName: "Garrison Barrack", description: "Stone-built tiered bunks for the Tower Guard.", paletteNote: "Stone brick, slate roof." },
  { buildingTypeId: "bunkhouse", cultureId: "rohirric", variantName: "Éored Longhouse", description: "A timber sleeping-hall for a riding company.", paletteNote: "Spruce and thatch." },
  // Granary.
  { buildingTypeId: "granary", cultureId: "rohirric", variantName: "Stilted Granary", description: "A timber grain-store raised on staddle-stones against the damp.", paletteNote: "Oak frame, thatch cap." },
  { buildingTypeId: "granary", cultureId: "hobbit", variantName: "Hill Larder", description: "A turf-roofed store dug back into the bank.", paletteNote: "Plaster, turf roof." },
  // Forge House.
  { buildingTypeId: "forge_building", cultureId: "dwarven", variantName: "Deep Forge", description: "A roaring stone-hooded forge vented to the mountain's flue.", paletteNote: "Granite, copper hood, gold trim." },
  { buildingTypeId: "forge_building", cultureId: "isengard", variantName: "Furnace-Pit", description: "An iron furnace sunk into the floor, fed by wheel and bellows.", paletteNote: "Deepslate and iron, lava-lit." },
  // Chapel / shrine.
  { buildingTypeId: "chapel", cultureId: "gondorian", variantName: "Hallow", description: "A white domed shrine to the Valar, silent and high.", paletteNote: "Quartz dome, gilded star." },
  { buildingTypeId: "chapel", cultureId: "haradrim", variantName: "Sun-Shrine", description: "A sandstone shrine to the southern sun, awning-shaded.", paletteNote: "Sandstone, orange awnings." },
];

// --- Faction → culture mapping (applied as an UPDATE on game.factions) ----

export const factionCultureCatalogue = [
  { factionId: "gondor", cultureId: "gondorian" },
  { factionId: "dol_amroth", cultureId: "gondorian" },
  { factionId: "rohan", cultureId: "rohirric" },
  { factionId: "erebor", cultureId: "dwarven" },
  { factionId: "iron_hills", cultureId: "dwarven" },
  { factionId: "lothlorien", cultureId: "silvan" },
  { factionId: "rivendell", cultureId: "noldorin" },
  { factionId: "shire", cultureId: "hobbit" },
  { factionId: "dale", cultureId: "dalish" },
  { factionId: "dunland", cultureId: "dunlending" },
  { factionId: "harad", cultureId: "haradrim" },
  { factionId: "rhun", cultureId: "easterling" },
  { factionId: "mordor", cultureId: "mordor" },
  { factionId: "isengard", cultureId: "isengard" },
];

// --- District consumes (tag-based) ---------------------------------------

export const districtConsumesCatalogue = [
  // Mines burn fuel for lamps, pumps, and shoring — per shaft (extraction
  // input scales with the extraction buildings, like output).
  { districtTypeId: "mine", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "deep_mine", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "bakery", tagId: "T:Grain", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "bakery", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "charcoal_burner", tagId: "T:Building", weightMin: 1, dailyAmount: 2 },
  { districtTypeId: "smithy", tagId: "T:Metal_Ore", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "smithy", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "foundry", tagId: "T:Metal", weightMin: 2, dailyAmount: 1 },
  { districtTypeId: "foundry", tagId: "T:Fuel", weightMin: 2, dailyAmount: 2 },
  // New chains. For outputFromBuildings districts these amounts are PER
  // production building (a 3-forge smithy draws 3× ore), so input scales
  // with output.
  { districtTypeId: "sawmill", tagId: "T:Building", weightMin: 2, dailyAmount: 2 },
  { districtTypeId: "tannery", tagId: "T:Rawhide", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "weavers_mill", tagId: "T:Cloth", weightMin: 2, dailyAmount: 1 },
  { districtTypeId: "brewery", tagId: "T:Grain", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "kiln_yard", tagId: "T:ClayRaw", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "kiln_yard", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "fletcher", tagId: "T:Timber", weightMin: 2, dailyAmount: 1 },
  { districtTypeId: "glassworks", tagId: "T:GlassRaw", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "glassworks", tagId: "T:Fuel", weightMin: 1, dailyAmount: 1 },
  { districtTypeId: "mint", tagId: "T:Metal", weightMin: 2, dailyAmount: 2 },
  { districtTypeId: "jeweller", tagId: "T:Precious", weightMin: 2, dailyAmount: 1 },
];

// --- District produces (base, resource-based) ----------------------------
// Biome outputs above override these per-tile where they match.

// NOTE: districts flagged outputFromBuildings (smithy, foundry, bakery, and
// the new industrial chains) do NOT list a flat produce here — their output
// is the sum of their production buildings (buildingOutputsCatalogue). Only
// tile-based extraction/agriculture has a flat per-district yield.
export const districtProducesCatalogue = [
  { districtTypeId: "wheat_farm", resourceId: "R:Wheat", dailyAmount: 4 },
  { districtTypeId: "charcoal_burner", resourceId: "R:Charcoal", dailyAmount: 2 },
  // New tile-based extraction / herding.
  { districtTypeId: "pasture", resourceId: "R:Wool", dailyAmount: 3 },
  { districtTypeId: "pasture", resourceId: "R:Hide", dailyAmount: 2, outputKind: "byproduct" },
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
    districtTypeId: "forestry_camp",
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
