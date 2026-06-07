/**
 * Dev seed for game.* and audit.*.
 *
 * Stands in for what the mod will eventually do on first boot: populate
 * canonical major factions, a couple of subfactions, a small set of
 * regions, the claim relationships, the capital settlements, and a few
 * audit events so the AuditFeed has something to show.
 *
 * Idempotent: every insert uses ON CONFLICT DO UPDATE so re-running the
 * script just refreshes the seed values rather than failing on duplicates.
 *
 * Run with:  pnpm db:seed
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as sqlOp } from "drizzle-orm";
import * as web from "../lib/db/schema/web.ts";
import * as game from "../lib/db/schema/game.ts";
import * as audit from "../lib/db/schema/audit.ts";
import * as configSchema from "../lib/db/schema/config.ts";
import {
  tagsCatalogue,
  resourcesCatalogue,
  resourceTagMappings,
  districtTypesCatalogue,
  districtStaffingCatalogue,
  districtEffectsCatalogue,
  districtBiomeOutputsCatalogue,
  districtPrerequisitesCatalogue,
  districtAdjacencyBonusesCatalogue,
  factionDistrictRulesCatalogue,
  functionalComponentsCatalogue,
  buildingTypesCatalogue,
  buildingTagsCatalogue,
  districtRequiredBuildingsCatalogue,
  districtScaleBonusesCatalogue,
  districtRequiredComponentsCatalogue,
  districtFootprintCatalogue,
  decorationCriteriaCatalogue,
  tierDecorationThresholdsCatalogue,
  culturesCatalogue,
  culturePalettesCatalogue,
  buildingVariantsCatalogue,
  factionCultureCatalogue,
  districtConsumesCatalogue,
  districtProducesCatalogue,
  districtProductionBonusesCatalogue,
  districtRecipesCatalogue,
  districtTierOutputCatalogue,
  unitTypesCatalogue,
  unitRecruitmentCostCatalogue,
  unitAttacksCatalogue,
  unitRanksCatalogue,
  unitCountersCatalogue,
  unitTerrainModifiersCatalogue,
  combatTraitsCatalogue,
  unitTraitsCatalogue,
  unitAbilitiesCatalogue,
  occupationClassesCatalogue,
  POPULATION_COMPOSITION_BY_TIER,
} from "./catalogue-seed.ts";
const schema = { ...web, ...game, ...audit, ...configSchema };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set; aborting seed.");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1, ssl: "require" });
const db = drizzle(client, { schema });

// --- Data ----------------------------------------------------------------

type FactionSeed = {
  id: string;
  displayName: string;
  alignment: "good" | "evil" | "neutral";
  parentFactionId?: string;
  loreSummary: string;
  bannerHex: string;
};

const factions: FactionSeed[] = [
  {
    id: "gondor",
    displayName: "Gondor",
    alignment: "good",
    bannerHex: "#0f172a",
    loreSummary:
      "The southern Númenórean kingdom in exile. Diminished but still the bulwark of the West, ruled from the White City of Minas Tirith.",
  },
  {
    id: "rohan",
    displayName: "Rohan",
    alignment: "good",
    bannerHex: "#15803d",
    loreSummary:
      "The horse-lords of the Mark, oathbound to Gondor. A young kingdom of cavalry and grasslands, ruled from Edoras.",
  },
  {
    id: "mordor",
    displayName: "Mordor",
    alignment: "evil",
    bannerHex: "#7f1d1d",
    loreSummary:
      "The Dark Land. Sauron's stronghold, ringed by mountains and lit by the fires of Orodruin.",
  },
  {
    id: "isengard",
    displayName: "Isengard",
    alignment: "evil",
    bannerHex: "#3f3f46",
    loreSummary:
      "Once a Gondorian fortress, now Saruman's industrial heart. The valley of Orthanc churns with smoke and Uruk-hai.",
  },
  {
    id: "lothlorien",
    displayName: "Lothlórien",
    alignment: "good",
    bannerHex: "#65a30d",
    loreSummary:
      "The Golden Wood. Galadriel's refuge, defended by the Galadhrim and the unseen power of Nenya.",
  },
  {
    id: "rivendell",
    displayName: "Rivendell",
    alignment: "good",
    bannerHex: "#0e7490",
    loreSummary:
      "Imladris, the Last Homely House. Elrond's seat, sanctuary of lore, the Vilya-warded valley.",
  },
  {
    id: "erebor",
    displayName: "Erebor",
    alignment: "good",
    bannerHex: "#b45309",
    loreSummary:
      "The Lonely Mountain. The reclaimed kingdom of Durin's Folk under the line of Thorin Stonehelm.",
  },
  {
    id: "dale",
    displayName: "Dale",
    alignment: "good",
    bannerHex: "#a16207",
    loreSummary:
      "The market city of the long lake's north shore. Allied with Erebor, raised again by Bard's line.",
  },
  {
    id: "shire",
    displayName: "The Shire",
    alignment: "good",
    bannerHex: "#a3a847",
    loreSummary:
      "Four farthings of hobbit smials and farmlands. Watched over by the Rangers; oblivious to most of it.",
  },
  {
    id: "harad",
    displayName: "Harad",
    alignment: "evil",
    bannerHex: "#dc2626",
    loreSummary:
      "The southern peoples — Haradrim warriors, the corsairs of Umbar, the desert chiefdoms. Bent to Sauron's will, but proud.",
  },
  {
    id: "rhun",
    displayName: "Rhûn",
    alignment: "evil",
    bannerHex: "#a21caf",
    loreSummary:
      "The Easterlings. Wagon-kings and chariot-lords of the Inland Sea, ancient enemies of Gondor.",
  },
  {
    id: "dunland",
    displayName: "Dunland",
    alignment: "neutral",
    bannerHex: "#78716c",
    loreSummary:
      "The hill-folk of Eriador's western marches. Long resentful of Rohan, courted by Isengard.",
  },
  // Subfactions
  {
    id: "dol_amroth",
    displayName: "Dol Amroth",
    alignment: "good",
    parentFactionId: "gondor",
    bannerHex: "#1e40af",
    loreSummary:
      "The Swan Knights of the Belfalas coast. Half-elven prince's seat; Gondor's finest cavalry.",
  },
  {
    id: "iron_hills",
    displayName: "Iron Hills",
    alignment: "good",
    parentFactionId: "erebor",
    bannerHex: "#92400e",
    loreSummary:
      "Dáin's old dominion. Heavy-armoured Longbeards, the anvil of Erebor's military.",
  },
];

type RegionSeed = {
  id: string;
  displayName: string;
  biome: "mountain" | "forest" | "plain" | "water" | "desert";
  centreX: number;
  centreZ: number;
  claimedBy?: string;
};

const regions: RegionSeed[] = [
  { id: "AR01", displayName: "Anórien — Minas Tirith", biome: "plain", centreX: 4000, centreZ: 1000, claimedBy: "gondor" },
  { id: "AR02", displayName: "Pelennor Fields", biome: "plain", centreX: 4200, centreZ: 1100, claimedBy: "gondor" },
  { id: "AR03", displayName: "Osgiliath", biome: "plain", centreX: 4400, centreZ: 1050, claimedBy: "gondor" },
  { id: "AR04", displayName: "Ithilien", biome: "forest", centreX: 4700, centreZ: 1000, claimedBy: "gondor" },
  { id: "DA01", displayName: "Belfalas — Dol Amroth", biome: "plain", centreX: 3600, centreZ: 1800, claimedBy: "dol_amroth" },
  { id: "DA02", displayName: "Belfalas Coast", biome: "water", centreX: 3700, centreZ: 1900, claimedBy: "dol_amroth" },
  { id: "RW01", displayName: "Edoras", biome: "plain", centreX: 2800, centreZ: 800, claimedBy: "rohan" },
  { id: "RW02", displayName: "Westfold", biome: "plain", centreX: 2400, centreZ: 700, claimedBy: "rohan" },
  { id: "MM01", displayName: "Gorgoroth — Barad-dûr", biome: "desert", centreX: 5400, centreZ: 1200, claimedBy: "mordor" },
  { id: "MM02", displayName: "Plateau of Gorgoroth", biome: "desert", centreX: 5200, centreZ: 1100, claimedBy: "mordor" },
  { id: "IS01", displayName: "Isengard Valley", biome: "mountain", centreX: 2100, centreZ: 400, claimedBy: "isengard" },
  { id: "LO01", displayName: "Caras Galadhon", biome: "forest", centreX: 3200, centreZ: 200, claimedBy: "lothlorien" },
  { id: "RV01", displayName: "Imladris", biome: "mountain", centreX: 2600, centreZ: -800, claimedBy: "rivendell" },
  { id: "EB01", displayName: "The Lonely Mountain", biome: "mountain", centreX: 4200, centreZ: -1400, claimedBy: "erebor" },
  { id: "IH01", displayName: "Iron Hills", biome: "mountain", centreX: 4900, centreZ: -1500, claimedBy: "iron_hills" },
  { id: "DL01", displayName: "Dale", biome: "plain", centreX: 4100, centreZ: -1300, claimedBy: "dale" },
  { id: "SH01", displayName: "The Shire — Hobbiton", biome: "plain", centreX: 1200, centreZ: -700, claimedBy: "shire" },
  { id: "HA01", displayName: "Umbar Haven", biome: "desert", centreX: 4200, centreZ: 2600, claimedBy: "harad" },
  { id: "RH01", displayName: "Sea of Rhûn — south shore", biome: "water", centreX: 5600, centreZ: -400, claimedBy: "rhun" },
  { id: "DN01", displayName: "Dunland Highlands", biome: "mountain", centreX: 2200, centreZ: 100, claimedBy: "dunland" },
];

type SettlementSeed = {
  name: string;
  factionId: string;
  regionId: string;
  tier:
    | "hamlet"
    | "steading"
    | "village"
    | "burgh"
    | "town"
    | "city"
    | "great_city"
    | "capital";
  population: number;
  populationCap: number;
  centreX: number;
  centreZ: number;
};

const settlements: SettlementSeed[] = [
  { name: "Minas Tirith", factionId: "gondor", regionId: "AR01", tier: "capital", population: 480, populationCap: 600, centreX: 4000, centreZ: 1000 },
  { name: "Dol Amroth", factionId: "dol_amroth", regionId: "DA01", tier: "great_city", population: 380, populationCap: 500, centreX: 3600, centreZ: 1800 },
  { name: "Edoras", factionId: "rohan", regionId: "RW01", tier: "capital", population: 320, populationCap: 500, centreX: 2800, centreZ: 800 },
  { name: "Helm's Deep", factionId: "rohan", regionId: "RW02", tier: "city", population: 220, populationCap: 380, centreX: 2400, centreZ: 700 },
  { name: "Barad-dûr", factionId: "mordor", regionId: "MM01", tier: "capital", population: 540, populationCap: 700, centreX: 5400, centreZ: 1200 },
  { name: "Isengard", factionId: "isengard", regionId: "IS01", tier: "capital", population: 410, populationCap: 600, centreX: 2100, centreZ: 400 },
  { name: "Caras Galadhon", factionId: "lothlorien", regionId: "LO01", tier: "capital", population: 290, populationCap: 450, centreX: 3200, centreZ: 200 },
  { name: "Imladris", factionId: "rivendell", regionId: "RV01", tier: "capital", population: 210, populationCap: 320, centreX: 2600, centreZ: -800 },
  { name: "Erebor", factionId: "erebor", regionId: "EB01", tier: "capital", population: 360, populationCap: 520, centreX: 4200, centreZ: -1400 },
  { name: "Iron Hills Hold", factionId: "iron_hills", regionId: "IH01", tier: "great_city", population: 240, populationCap: 360, centreX: 4900, centreZ: -1500 },
  { name: "Dale", factionId: "dale", regionId: "DL01", tier: "city", population: 195, populationCap: 280, centreX: 4100, centreZ: -1300 },
  { name: "Michel Delving", factionId: "shire", regionId: "SH01", tier: "town", population: 165, populationCap: 240, centreX: 1200, centreZ: -700 },
  { name: "Umbar", factionId: "harad", regionId: "HA01", tier: "great_city", population: 350, populationCap: 480, centreX: 4200, centreZ: 2600 },
  { name: "Rhûn Anchorage", factionId: "rhun", regionId: "RH01", tier: "town", population: 130, populationCap: 200, centreX: 5600, centreZ: -400 },
  { name: "Dunharrow Camp", factionId: "dunland", regionId: "DN01", tier: "village", population: 75, populationCap: 110, centreX: 2200, centreZ: 100 },
];

type EventSeed = {
  eventType: string;
  factionId?: string;
  visibility?: "public" | "faction" | "admin";
  payload: Record<string, unknown>;
  daysAgo: number;
};

// --- Phase 3.1 seed data --------------------------------------------------

type CharacterSeed = {
  factionId: string;
  name: string;
  race: "man" | "elf" | "dwarf" | "hobbit" | "orc";
  title: string | null;
  birthYearRp: number;
  woundScore: number;
  influence: number;
  currentRegionId: string | null;
  biography: string;
};

const characters_seed: CharacterSeed[] = [
  { factionId: "gondor", name: "Faramir of Ithilien", race: "man", title: "Steward of Gondor", birthYearRp: 2983, woundScore: 12, influence: 180, currentRegionId: "AR01",
    biography: "Captain of the Rangers of Ithilien before the War; now Steward of the City under King Elessar. Reads in Minas Tirith's archives more than rumours suggest." },
  { factionId: "rohan", name: "Éomer Éadig", race: "man", title: "King of the Mark", birthYearRp: 2991, woundScore: 8, influence: 220, currentRegionId: "RW01",
    biography: "Third Marshal of the Mark during the War; now king after the Battle of the Pelennor. Holds the Oath of Eorl as the spine of policy." },
  { factionId: "mordor", name: "Mauhúr the Black-Eyed", race: "orc", title: "Captain of the Watch", birthYearRp: 2967, woundScore: 34, influence: 90, currentRegionId: "MM01",
    biography: "Risen through Sauron's siegeworks. Bears scars from the Pelennor. Reports directly to the Mouth." },
  { factionId: "isengard", name: "Snaga the Pale", race: "orc", title: "Overseer", birthYearRp: 2975, woundScore: 21, influence: 60, currentRegionId: "IS01",
    biography: "Uruk-hai foreman of the Orthanc pits since Saruman's flight. Pragmatic where his kin are zealots." },
  { factionId: "lothlorien", name: "Haldir of Lórien", race: "elf", title: "Marchwarden", birthYearRp: 2400, woundScore: 2, influence: 260, currentRegionId: "LO01",
    biography: "Marchwarden of the northern fences. Old by mortal reckoning, young by his own. Survived Helm's Deep against Galadriel's expectation." },
  { factionId: "rivendell", name: "Elrohir Elrondion", race: "elf", title: "Heir of Imladris", birthYearRp: 130, woundScore: 4, influence: 200, currentRegionId: "RV01",
    biography: "Son of Elrond; rode with the Rangers of the North through the War. Stayed in Imladris when his sister and father sailed." },
  { factionId: "erebor", name: "Thorin Stonehelm", race: "dwarf", title: "King under the Mountain", birthYearRp: 2866, woundScore: 18, influence: 240, currentRegionId: "EB01",
    biography: "Held the King's seat through the Battle of Dale. Diplomatic where his ancestors were not." },
  { factionId: "dale", name: "Bard II", race: "man", title: "King of Dale", birthYearRp: 2977, woundScore: 6, influence: 150, currentRegionId: "DL01",
    biography: "Grandson of Bard the Bowman. Rebuilt the long market after the War." },
  { factionId: "shire", name: "Meriadoc Brandybuck", race: "hobbit", title: "Master of Buckland", birthYearRp: 2982, woundScore: 9, influence: 170, currentRegionId: "SH01",
    biography: "Esquire of Rohan, slayer of the Witch-king alongside Éowyn. Returned to the Shire and the Mathom-house." },
  { factionId: "harad", name: "Suladân the Younger", race: "man", title: "Serpent-lord of Harad", birthYearRp: 2972, woundScore: 22, influence: 130, currentRegionId: "HA01",
    biography: "Heir to the southern banners. Considers Gondor's victory a setback, not a verdict." },
  { factionId: "rhun", name: "Khamûl-tan", race: "man", title: "Wagon-king", birthYearRp: 2960, woundScore: 15, influence: 110, currentRegionId: "RH01",
    biography: "Named for the Easterling Nazgûl in mockery or homage. Leads the chariot-cohorts of the inland sea." },
  { factionId: "dunland", name: "Wulf of the Hills", race: "man", title: "Chieftain", birthYearRp: 2980, woundScore: 11, influence: 70, currentRegionId: "DN01",
    biography: "Carries his clan's old grievance against Rohan. Trades cautiously with Isengard's leftovers." },
  { factionId: "dol_amroth", name: "Imrahil II", race: "man", title: "Prince of Dol Amroth", birthYearRp: 2988, woundScore: 5, influence: 190, currentRegionId: "DA01",
    biography: "Half-elven heritage worn lightly. Captain of the Swan Knights since the War's end." },
  { factionId: "iron_hills", name: "Náin IV", race: "dwarf", title: "Lord of the Iron Hills", birthYearRp: 2920, woundScore: 14, influence: 160, currentRegionId: "IH01",
    biography: "Direct line from Dáin Ironfoot. Heavy-axe of the Eastern Front." },
];

type DistrictSeed = {
  settlementName: string;
  districtType: string;
  category: string;
  popCost: number;
};

const districts_seed: DistrictSeed[] = [
  // Capitals get a baseline 4-district loadout: residential + agricultural
  // + military + governance. Real settlements would have many more; this is
  // enough to make the dashboards look populated.
  ...[
    "Minas Tirith", "Edoras", "Barad-dûr", "Isengard",
    "Caras Galadhon", "Imladris", "Erebor", "Dale",
    "Michel Delving", "Umbar", "Dol Amroth", "Iron Hills Hold",
  ].flatMap((settlementName) => [
    { settlementName, districtType: "cottage_quarter", category: "residential", popCost: 0 },
    { settlementName, districtType: "wheat_farm", category: "agricultural", popCost: 4 },
    { settlementName, districtType: "barracks", category: "military", popCost: 2 },
    { settlementName, districtType: "great_hall", category: "governance", popCost: 3 },
  ]),
];

type UnitSeed = {
  unitType: string;
  factionId: string;
  count: number;
  garrisonedAtName: string;
};

const units_seed: UnitSeed[] = [
  { factionId: "gondor", unitType: "citadel_guard", count: 60, garrisonedAtName: "Minas Tirith" },
  { factionId: "gondor", unitType: "tower_archer", count: 80, garrisonedAtName: "Minas Tirith" },
  { factionId: "rohan", unitType: "rohirrim", count: 120, garrisonedAtName: "Edoras" },
  { factionId: "mordor", unitType: "uruk_hai", count: 200, garrisonedAtName: "Barad-dûr" },
  { factionId: "mordor", unitType: "orc_archer", count: 150, garrisonedAtName: "Barad-dûr" },
  { factionId: "isengard", unitType: "uruk_hai", count: 100, garrisonedAtName: "Isengard" },
  { factionId: "lothlorien", unitType: "galadhrim_warden", count: 60, garrisonedAtName: "Caras Galadhon" },
  { factionId: "rivendell", unitType: "imladris_blade", count: 40, garrisonedAtName: "Imladris" },
  { factionId: "erebor", unitType: "longbeard_warrior", count: 80, garrisonedAtName: "Erebor" },
  { factionId: "dale", unitType: "dale_archer", count: 50, garrisonedAtName: "Dale" },
  { factionId: "harad", unitType: "haradrim_lancer", count: 90, garrisonedAtName: "Umbar" },
  { factionId: "rhun", unitType: "easterling_charioteer", count: 70, garrisonedAtName: "Rhûn Anchorage" },
  { factionId: "dol_amroth", unitType: "swan_knight", count: 50, garrisonedAtName: "Dol Amroth" },
  { factionId: "iron_hills", unitType: "iron_hills_axe", count: 60, garrisonedAtName: "Iron Hills Hold" },
];

const resourceStocks_seed: { factionId: string; resourceId: string; quantity: number }[] = [
  { factionId: "gondor", resourceId: "R:Wheat", quantity: 240 },
  { factionId: "gondor", resourceId: "R:Iron", quantity: 80 },
  { factionId: "gondor", resourceId: "R:Stone", quantity: 200 },
  { factionId: "rohan", resourceId: "R:Wheat", quantity: 320 },
  { factionId: "rohan", resourceId: "R:Horses", quantity: 60 },
  { factionId: "mordor", resourceId: "R:Iron", quantity: 180 },
  { factionId: "mordor", resourceId: "R:Coal", quantity: 240 },
  { factionId: "isengard", resourceId: "R:Iron", quantity: 140 },
  { factionId: "isengard", resourceId: "R:Coal", quantity: 200 },
  { factionId: "lothlorien", resourceId: "R:Mallorn", quantity: 40 },
  { factionId: "rivendell", resourceId: "R:Athelas", quantity: 12 },
  { factionId: "erebor", resourceId: "R:Mithril_Ore", quantity: 8 },
  { factionId: "erebor", resourceId: "R:Iron", quantity: 220 },
  { factionId: "dale", resourceId: "R:Wheat", quantity: 100 },
  { factionId: "shire", resourceId: "R:Pipeweed", quantity: 60 },
  { factionId: "shire", resourceId: "R:Wheat", quantity: 180 },
  { factionId: "harad", resourceId: "R:Spices", quantity: 80 },
  { factionId: "rhun", resourceId: "R:Horses", quantity: 50 },
  { factionId: "dol_amroth", resourceId: "R:Pearl", quantity: 24 },
  { factionId: "iron_hills", resourceId: "R:Iron", quantity: 280 },
];

// [factionId, treasuryCoin, treasuryDp]
const treasury_seed: [string, number, number][] = [
  ["gondor", 4200, 1800],
  ["rohan", 2400, 1200],
  ["mordor", 6800, 800],
  ["isengard", 3200, 400],
  ["lothlorien", 1800, 2400],
  ["rivendell", 2200, 2600],
  ["erebor", 5400, 1400],
  ["dale", 1800, 1000],
  ["shire", 900, 800],
  ["harad", 3600, 600],
  ["rhun", 2400, 500],
  ["dunland", 600, 200],
  ["dol_amroth", 1800, 800],
  ["iron_hills", 2200, 700],
];

type WikiSeed = { slug: string; title: string; category: string; body: string };

const wikiPages: WikiSeed[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    category: "Getting Started",
    body: `Welcome. This is a modded Minecraft server set in the late Third Age of Middle-earth. You'll play a character, belong to a faction, build settlements, trade, fight, and tell stories.

## How to join

1. **Read this page and the [mechanics overview](/wiki/mechanics-overview).** Five minutes will save you an hour later.
2. **Pick a faction.** Browse [the factions index](/factions) — every faction is recruiting. Click any card to see what they hold and what they're about.
3. **Sign in with Discord** (top right). That creates your account.
4. **Link your Minecraft username.** Hit "Link Minecraft" in the nav after signing in. You'll get a one-time code to enter in-game.
5. **Hop into Discord.** Faction officers will say hi and point you at your first task.

## What to expect in your first hour

- You'll be greeted in the in-game chat and on Discord
- You'll be given a small first task — building a hovel, working a farm, escorting a caravan
- You'll have somewhere to look for "what's next" (your faction's Discord channel and the dashboard once it lands in Phase 3)

## What you can't do yet

This is **Phase 2**. The website shows the world's state and lets you browse it. Game actions — recruiting units, claiming regions, declaring wars — arrive as the mod is built out alongside.`,
  },
  {
    slug: "mechanics-overview",
    title: "Mechanics overview",
    category: "Mechanics",
    body: `A whirlwind tour of how the server works. Each section has its own page once we get to writing them.

## The three currencies

- **Diplomacy Points (DP)** — for things between factions: alliances, war declarations, trade deals, claiming new regions.
- **Coin** — for things inside a faction: founding settlements, building districts, military upkeep, caravans.
- **Influence** — personal, per-character: council vote weight, personal questlines, character advancement.

**They don't convert.** Wealth doesn't buy alliances; a popular character can't personally fund a war.

## Settlements and tiers

Every settlement has a tier (Hamlet → Steading → Village → Burgh → Town → City → Great City → Capital). Higher tiers unlock more districts and bigger garrisons. Village and above can also *claim* a new region for the faction.

## Districts

Settlements are made of districts: housing, farms, mines, smithies, markets, military barracks, governance halls. Districts consume and produce **resources** that flow between settlements via **trade routes**.

## Factions

Major factions are the canon ones (Gondor, Rohan, Mordor, Isengard, Lothlórien, Erebor, Dale, Rivendell, the Shire, plus the evils — Harad, Rhûn, Dunland). Subfactions like Dol Amroth or the Iron Hills operate within a parent. Player-founded minor factions exist within canon-permitted spaces.

## Wars

Wars are declared, fought, and resolved through both mechanical battles (armies clash) and RP scenes (councils, peace talks). Casualties are permanent and individually re-recruited — wars cost.

## Characters

Each player has one active character. Wounds stack; the more your character has suffered, the more dangerous each new fight becomes. Death is possible, lineages and heirs are real. **Cautious characters can have long careers.**`,
  },
  {
    slug: "what-this-server-is",
    title: "What this server is",
    category: "Getting Started",
    body: `> A 4X civ-builder with strong RP scaffolding. Prosperity, conquest, and diplomacy are the engines; character and lore are the texture.

We are **canon-inspired, not canon-bound**. The world is Tolkien's. The history is the players'.

## Pillars

1. **Economy and building** — settlements, districts, supply chains, and trade are the daily rhythm.
2. **Combat and conquest** — wars are real, consequential, and resolved through both mechanical and RP systems.
3. **Diplomacy** — alliances, councils, and treaties shape the map.
4. **Story** — character arcs and written lore give the mechanics meaning.

When pillars conflict, the higher one wins.

## What we're not

- Not a recreation of the reference server. We borrow its mechanical vocabulary but we are not its successor.
- Not a hardcore-only experience. Punishment is for grief and abuse, not for new players learning the systems.
- Not staff-driven. Staff exist to adjudicate edge cases, approve major builds, and run world events.
- Not lore-purists. Players who want to write themselves into Middle-earth's history are the audience.
- Not a PvP arena. PvP exists in the service of war and story, not as the point.`,
  },
];

const events: EventSeed[] = [
  {
    eventType: "FACTION_FOUNDED",
    factionId: "shire",
    payload: { display_name: "The Shire" },
    daysAgo: 14,
  },
  {
    eventType: "REGION_CLAIMED",
    factionId: "rohan",
    payload: { region_id: "RW02", region_name: "Westfold", dp_cost: 240 },
    daysAgo: 10,
  },
  {
    eventType: "SETTLEMENT_FOUNDED",
    factionId: "dale",
    payload: { settlement_name: "Dale", tier: "city", region_id: "DL01" },
    daysAgo: 7,
  },
  {
    eventType: "TRADE_DEAL",
    factionId: "erebor",
    payload: { with: "dale", manifest: { gems: 12, iron: 8 } },
    daysAgo: 5,
  },
  {
    eventType: "COUNCIL_HELD",
    factionId: "rivendell",
    payload: { topic: "Movements in Mirkwood", weight: 180 },
    daysAgo: 3,
  },
  {
    eventType: "WAR_DECLARED",
    factionId: "mordor",
    payload: { against: "gondor", casus_belli: "Border raids in Ithilien" },
    daysAgo: 1,
  },
  {
    eventType: "DIPLOMATIC_ACTION",
    factionId: "rohan",
    payload: { action: "alliance_pledged", with: "gondor" },
    daysAgo: 0,
  },
];

// --- Insert --------------------------------------------------------------

async function main() {
  console.log("Seeding factions…");
  for (const f of factions) {
    await db
      .insert(schema.factions)
      .values({
        id: f.id,
        displayName: f.displayName,
        alignment: f.alignment,
        parentFactionId: f.parentFactionId,
        loreSummary: f.loreSummary,
        bannerHex: f.bannerHex,
      })
      .onConflictDoUpdate({
        target: schema.factions.id,
        set: {
          displayName: f.displayName,
          alignment: f.alignment,
          parentFactionId: f.parentFactionId,
          loreSummary: f.loreSummary,
          bannerHex: f.bannerHex,
        },
      });
  }

  console.log("Seeding config catalogue (tags, resources, district types, unit types)…");
  // Insert order matters because of FKs: tags & resources first, then their
  // M:N mapping, then district types + their consumes/produces, finally
  // unit types + recruitment costs.

  for (const t of tagsCatalogue) {
    await db
      .insert(schema.tags)
      .values(t)
      .onConflictDoUpdate({ target: schema.tags.id, set: { displayName: t.displayName, description: t.description } });
  }

  for (const r of resourcesCatalogue) {
    await db
      .insert(schema.resources)
      .values(r)
      .onConflictDoUpdate({
        target: schema.resources.id,
        set: { displayName: r.displayName, description: r.description, foodValue: r.foodValue },
      });
  }

  // Wipe and re-insert the M:N mapping — cleaner than figuring out which
  // specific rows changed when the catalogue is small.
  await db.execute(sqlOp`DELETE FROM config.resource_tags`);
  for (const rt of resourceTagMappings) {
    await db.insert(schema.resourceTags).values(rt);
  }

  for (const d of districtTypesCatalogue) {
    const row = {
      id: d.id,
      displayName: d.displayName,
      category: d.category,
      tierMin: d.tierMin,
      popCost: d.popCost ?? 0,
      populationCapProvided: d.populationCapProvided ?? 0,
      description: d.description,
      buildCoinCost: d.buildCoinCost ?? 0,
      buildDpCost: d.buildDpCost ?? 0,
      buildTimeDays: d.buildTimeDays ?? 0,
      upkeepCoinDaily: d.upkeepCoinDaily ?? 0,
      requiredBiomes: d.requiredBiomes ?? null,
      requiresDiscovery: d.requiresDiscovery ?? null,
      terrainRequirement: d.terrainRequirement ?? null,
      maxPerSettlement: d.maxPerSettlement ?? null,
      uniqueScope: d.uniqueScope ?? null,
      mandatoryAtTier: d.mandatoryAtTier ?? null,
      upgradesFrom: d.upgradesFrom ?? null,
      capFromHousing: d.capFromHousing ?? false,
      populationClass: d.populationClass ?? null,
      metadata: d.metadata ?? {},
    };
    await db
      .insert(schema.districtTypes)
      .values(row)
      .onConflictDoUpdate({
        target: schema.districtTypes.id,
        set: {
          displayName: row.displayName,
          category: row.category,
          tierMin: row.tierMin,
          popCost: row.popCost,
          populationCapProvided: row.populationCapProvided,
          description: row.description,
          buildCoinCost: row.buildCoinCost,
          buildDpCost: row.buildDpCost,
          buildTimeDays: row.buildTimeDays,
          upkeepCoinDaily: row.upkeepCoinDaily,
          requiredBiomes: row.requiredBiomes,
          requiresDiscovery: row.requiresDiscovery,
          terrainRequirement: row.terrainRequirement,
          maxPerSettlement: row.maxPerSettlement,
          uniqueScope: row.uniqueScope,
          mandatoryAtTier: row.mandatoryAtTier,
          upgradesFrom: row.upgradesFrom,
          capFromHousing: row.capFromHousing,
          populationClass: row.populationClass,
          metadata: row.metadata,
        },
      });
  }

  // New district-relation tables: wipe + reinsert (small, deterministic).
  await db.execute(sqlOp`DELETE FROM config.district_staffing`);
  for (const r of districtStaffingCatalogue) {
    await db.insert(schema.districtStaffing).values(r);
  }
  await db.execute(sqlOp`DELETE FROM config.district_effects`);
  for (const r of districtEffectsCatalogue) {
    await db.insert(schema.districtEffects).values(r);
  }
  await db.execute(sqlOp`DELETE FROM config.district_biome_outputs`);
  for (const r of districtBiomeOutputsCatalogue) {
    await db.insert(schema.districtBiomeOutputs).values(r);
  }
  await db.execute(sqlOp`DELETE FROM config.district_prerequisites`);
  for (const r of districtPrerequisitesCatalogue) {
    await db.insert(schema.districtPrerequisites).values(r);
  }
  await db.execute(sqlOp`DELETE FROM config.district_adjacency_bonuses`);
  for (const r of districtAdjacencyBonusesCatalogue) {
    await db.insert(schema.districtAdjacencyBonuses).values(r);
  }
  await db.execute(sqlOp`DELETE FROM config.faction_district_rules`);
  for (const r of factionDistrictRulesCatalogue) {
    await db.insert(schema.factionDistrictRules).values(r);
  }

  // Building composition: components, buildings, district requirements,
  // footprint overrides, decoration scoring.
  await db.execute(sqlOp`DELETE FROM config.district_required_components`);
  await db.execute(sqlOp`DELETE FROM config.district_required_buildings`);
  await db.execute(sqlOp`DELETE FROM config.building_provides_components`);
  await db.execute(sqlOp`DELETE FROM config.building_tags`);

  // Housing rework: retired residential DISTRICT ids. The old single-building
  // ones (hovel/cottage/house/manor) became buildings; the first-pass quarters
  // (town_quarter/tenement_block/merchant_row) were reorganised by class.
  // Drop the stale rows — their child requirements were just wiped above.
  await db.execute(
    sqlOp`DELETE FROM config.district_types WHERE id IN ('hovel', 'cottage', 'house', 'manor', 'town_quarter', 'tenement_block', 'merchant_row')`,
  );

  for (const fc of functionalComponentsCatalogue) {
    await db
      .insert(schema.functionalComponents)
      .values(fc)
      .onConflictDoUpdate({
        target: schema.functionalComponents.id,
        set: { displayName: fc.displayName, description: fc.description },
      });
  }
  for (const b of buildingTypesCatalogue) {
    const fields = {
      displayName: b.displayName,
      description: b.description,
      category: b.category,
      tierMin: b.tierMin ?? null,
      minFootprintBlocks: b.minFootprintBlocks ?? null,
      maxFootprintBlocks: b.maxFootprintBlocks ?? null,
      minHeightBlocks: b.minHeightBlocks ?? null,
      upgradesFrom: b.upgradesFrom ?? null,
      level: b.level ?? 1,
      housingClass: b.housingClass ?? null,
    };
    await db
      .insert(schema.buildingTypes)
      .values({ id: b.id, ...fields })
      .onConflictDoUpdate({ target: schema.buildingTypes.id, set: fields });
    for (const comp of b.provides) {
      await db.insert(schema.buildingProvidesComponents).values({
        buildingTypeId: b.id,
        componentId: comp,
        quantity: b.quantities?.[comp] ?? 1,
      });
    }
    // Every housing building is theme:residential, so it satisfies a
    // quarter's housing slot without being listed in buildingTagsCatalogue.
    if (b.category === "residential") {
      await db
        .insert(schema.buildingTags)
        .values({ buildingTypeId: b.id, tag: "theme:residential" });
    }
  }
  for (const bt of buildingTagsCatalogue) {
    await db.insert(schema.buildingTags).values(bt);
  }
  for (const rb of districtRequiredBuildingsCatalogue) {
    await db.insert(schema.districtRequiredBuildings).values({
      districtTypeId: rb.districtTypeId,
      kind: rb.kind,
      buildingTypeId: rb.buildingTypeId,
      count: rb.count,
      maxCount: rb.maxCount ?? null,
      themeNote: rb.themeNote,
      themeTag: rb.themeTag ?? null,
      groupKey: rb.groupKey ?? null,
    });
  }
  for (const rc of districtRequiredComponentsCatalogue) {
    await db.insert(schema.districtRequiredComponents).values(rc);
  }
  await db.execute(sqlOp`DELETE FROM config.district_scale_bonuses`);
  for (const sb of districtScaleBonusesCatalogue) {
    await db.insert(schema.districtScaleBonuses).values(sb);
  }

  // Cultures + cosmetic building variants + approved palettes.
  await db.execute(sqlOp`DELETE FROM config.building_variants`);
  await db.execute(sqlOp`DELETE FROM config.culture_palettes`);
  for (const c of culturesCatalogue) {
    await db
      .insert(schema.cultures)
      .values(c)
      .onConflictDoUpdate({
        target: schema.cultures.id,
        set: {
          displayName: c.displayName,
          description: c.description,
          parentCultureId: c.parentCultureId,
        },
      });
  }
  for (const cp of culturePalettesCatalogue) {
    await db.insert(schema.culturePalettes).values(cp);
  }
  for (const bv of buildingVariantsCatalogue) {
    await db.insert(schema.buildingVariants).values(bv);
  }
  // Map each faction onto its culture (UPDATE pass on game.factions).
  for (const fc of factionCultureCatalogue) {
    await db
      .update(schema.factions)
      .set({ cultureId: fc.cultureId })
      .where(sqlOp`${schema.factions.id} = ${fc.factionId}`);
  }

  // Footprint / height / decoration overrides as an UPDATE pass.
  for (const f of districtFootprintCatalogue) {
    await db
      .update(schema.districtTypes)
      .set({
        minFootprintBlocks: f.minFootprintBlocks ?? null,
        maxFootprintBlocks: f.maxFootprintBlocks ?? null,
        minHeightBlocks: f.minHeightBlocks ?? null,
        decorationThreshold: f.decorationThreshold ?? null,
      })
      .where(sqlOp`${schema.districtTypes.id} = ${f.id}`);
  }

  for (const dc of decorationCriteriaCatalogue) {
    await db
      .insert(schema.decorationCriteria)
      .values(dc)
      .onConflictDoUpdate({
        target: schema.decorationCriteria.id,
        set: {
          displayName: dc.displayName,
          description: dc.description,
          weightPct: dc.weightPct,
        },
      });
  }
  for (const td of tierDecorationThresholdsCatalogue) {
    await db
      .insert(schema.tierDecorationThresholds)
      .values(td)
      .onConflictDoUpdate({
        target: schema.tierDecorationThresholds.tier,
        set: { minScore: td.minScore, reviewMode: td.reviewMode, note: td.note },
      });
  }

  await db.execute(sqlOp`DELETE FROM config.district_consumes`);
  for (const dc of districtConsumesCatalogue) {
    await db.insert(schema.districtConsumes).values(dc);
  }

  await db.execute(sqlOp`DELETE FROM config.district_produces`);
  for (const dp of districtProducesCatalogue) {
    await db.insert(schema.districtProduces).values(dp);
  }

  // Production sophistication: conditional bonuses, recipes, tier scaling.
  await db.execute(sqlOp`DELETE FROM config.district_production_bonuses`);
  for (const b of districtProductionBonusesCatalogue) {
    await db.insert(schema.districtProductionBonuses).values(b);
  }

  // Recipes carry nested consumes/produces — insert the recipe, get its
  // id, then the children. Order matters for the FK delete.
  await db.execute(sqlOp`DELETE FROM config.recipe_consumes`);
  await db.execute(sqlOp`DELETE FROM config.recipe_produces`);
  await db.execute(sqlOp`DELETE FROM config.district_recipes`);
  for (const r of districtRecipesCatalogue) {
    const inserted = await db
      .insert(schema.districtRecipes)
      .values({
        districtTypeId: r.districtTypeId,
        recipeKey: r.recipeKey,
        displayName: r.displayName,
        description: r.description,
      })
      .returning({ id: schema.districtRecipes.id });
    const recipeId = inserted[0]!.id;
    for (const c of r.consumes) {
      await db.insert(schema.recipeConsumes).values({ recipeId, ...c });
    }
    for (const p of r.produces) {
      await db.insert(schema.recipeProduces).values({ recipeId, ...p });
    }
  }

  await db.execute(sqlOp`DELETE FROM config.district_tier_output`);
  for (const t of districtTierOutputCatalogue) {
    await db.insert(schema.districtTierOutput).values(t);
  }

  for (const u of unitTypesCatalogue) {
    await db
      .insert(schema.unitTypes)
      .values(u)
      .onConflictDoUpdate({
        target: schema.unitTypes.id,
        set: {
          displayName: u.displayName,
          factionId: u.factionId,
          category: u.category,
          tierRequired: u.tierRequired,
          recruitmentTimeDays: u.recruitmentTimeDays,
          popCost: u.popCost,
          coinCost: u.coinCost,
          upkeepFoodDaily: u.upkeepFoodDaily,
          upkeepCoinDaily: u.upkeepCoinDaily,
          health: u.health,
          armor: u.armor,
          morale: u.morale,
          speed: u.speed,
          description: u.description,
        },
      });
  }

  await db.execute(sqlOp`DELETE FROM config.unit_recruitment_cost`);
  for (const urc of unitRecruitmentCostCatalogue) {
    await db.insert(schema.unitRecruitmentCost).values(urc);
  }

  // Military depth: attacks, ranks, counters, terrain, traits, abilities.
  await db.execute(sqlOp`DELETE FROM config.unit_attacks`);
  for (const a of unitAttacksCatalogue) {
    await db.insert(schema.unitAttacks).values(a);
  }
  for (const r of unitRanksCatalogue) {
    await db
      .insert(schema.unitRanks)
      .values(r)
      .onConflictDoUpdate({
        target: schema.unitRanks.rankKey,
        set: {
          displayName: r.displayName,
          level: r.level,
          xpRequired: r.xpRequired,
          healthMultPct: r.healthMultPct,
          damageMultPct: r.damageMultPct,
          moraleBonus: r.moraleBonus,
          description: r.description,
        },
      });
  }
  await db.execute(sqlOp`DELETE FROM config.unit_counters`);
  for (const c of unitCountersCatalogue) {
    await db.insert(schema.unitCounters).values(c);
  }
  await db.execute(sqlOp`DELETE FROM config.unit_terrain_modifiers`);
  for (const t of unitTerrainModifiersCatalogue) {
    await db.insert(schema.unitTerrainModifiers).values(t);
  }
  // Traits before unit_traits (FK); combat_traits is upserted.
  await db.execute(sqlOp`DELETE FROM config.unit_traits`);
  for (const ct of combatTraitsCatalogue) {
    await db
      .insert(schema.combatTraits)
      .values(ct)
      .onConflictDoUpdate({
        target: schema.combatTraits.id,
        set: { displayName: ct.displayName, description: ct.description, effect: ct.effect },
      });
  }
  for (const ut of unitTraitsCatalogue) {
    await db.insert(schema.unitTraits).values(ut);
  }
  await db.execute(sqlOp`DELETE FROM config.unit_abilities`);
  for (const ab of unitAbilitiesCatalogue) {
    await db.insert(schema.unitAbilities).values(ab);
  }

  for (const oc of occupationClassesCatalogue) {
    await db
      .insert(schema.occupationClasses)
      .values(oc)
      .onConflictDoUpdate({
        target: schema.occupationClasses.id,
        set: {
          displayName: oc.displayName,
          description: oc.description,
          rank: oc.rank,
          metadata: oc.metadata,
        },
      });
  }

  console.log("Seeding regions and claims…");
  for (const r of regions) {
    await db
      .insert(schema.regions)
      .values({
        id: r.id,
        displayName: r.displayName,
        biome: r.biome,
        centreX: r.centreX,
        centreZ: r.centreZ,
      })
      .onConflictDoUpdate({
        target: schema.regions.id,
        set: {
          displayName: r.displayName,
          biome: r.biome,
          centreX: r.centreX,
          centreZ: r.centreZ,
        },
      });

    if (r.claimedBy) {
      await db
        .insert(schema.regionClaims)
        .values({
          regionId: r.id,
          factionId: r.claimedBy,
          claimDpCost: 240,
        })
        .onConflictDoUpdate({
          target: schema.regionClaims.regionId,
          set: { factionId: r.claimedBy },
        });
    }
  }

  console.log("Seeding settlements…");
  // Settlements are autonumber; idempotency is name+region uniqueness, which
  // we don't have a constraint for. Strategy: delete-and-reinsert keyed on
  // (name, regionId). Simpler than tracking IDs across runs at this scale.
  // Delete child rows first to satisfy FKs.
  await db.execute(sqlOp`DELETE FROM game.settlement_population`);
  await db.execute(sqlOp`DELETE FROM game.units WHERE garrisoned_at IS NOT NULL`);
  await db.execute(sqlOp`DELETE FROM game.districts`);
  await db.execute(sqlOp`DELETE FROM game.settlements`);
  for (const s of settlements) {
    await db.insert(schema.settlements).values({
      name: s.name,
      factionId: s.factionId,
      regionId: s.regionId,
      tier: s.tier,
      population: s.population,
      populationCap: s.populationCap,
      centreX: s.centreX,
      centreZ: s.centreZ,
    });
  }

  console.log("Seeding settlement population breakdown…");
  // For each settlement, distribute its `population` across occupation
  // classes per the tier's composition. Round to ints; absorb rounding
  // remainder into peasants so the total exactly matches.
  await db.execute(sqlOp`DELETE FROM game.settlement_population`);
  const settlementRows = await db.select().from(schema.settlements);
  for (const s of settlementRows) {
    const composition: Record<string, number> =
      POPULATION_COMPOSITION_BY_TIER[s.tier] ??
      POPULATION_COMPOSITION_BY_TIER.village!;
    const counts: Record<string, number> = {};
    let allocated = 0;
    for (const classId of Object.keys(composition)) {
      if (classId === "peasant") continue;
      const pct = composition[classId]!;
      const c = Math.round((pct / 100) * s.population);
      counts[classId] = c;
      allocated += c;
    }
    counts.peasant = Math.max(0, s.population - allocated);
    for (const classId of Object.keys(counts)) {
      const count = counts[classId]!;
      if (count > 0) {
        await db.insert(schema.settlementPopulation).values({
          settlementId: s.id,
          classId,
          count,
        });
      }
    }
  }

  console.log("Seeding audit events…");
  // Same simplification — clear and re-insert. Real events accumulate during play.
  await db.execute(sqlOp`DELETE FROM audit.events`);
  const now = Date.now();
  for (const e of events) {
    const occurredAt = new Date(now - e.daysAgo * 24 * 60 * 60 * 1000);
    await db.insert(schema.events).values({
      eventType: e.eventType,
      factionId: e.factionId,
      visibility: e.visibility ?? "public",
      payload: e.payload,
      occurredAt,
    });
  }

  // --- New Phase 3.1 tables ---------------------------------------------

  console.log("Seeding seed-bot account (owns NPC characters)…");
  await db
    .insert(schema.accounts)
    .values({
      discordId: "seed-bot",
      discordUsername: "seed-bot",
      discordAvatar: null,
      email: null,
    })
    .onConflictDoNothing();

  console.log("Seeding characters, districts, units, resources…");
  // Clear-and-reinsert for the new tables. Real-mod state accumulates; the
  // seed represents a clean Day 0.
  await db.execute(sqlOp`DELETE FROM game.resource_stocks`);
  await db.execute(sqlOp`DELETE FROM game.units`);
  await db.execute(sqlOp`DELETE FROM game.armies`);
  await db.execute(sqlOp`DELETE FROM game.districts`);
  await db.execute(sqlOp`DELETE FROM game.characters`);

  // One character per faction (including subfactions). Real player
  // characters are created via the UI later; seed-bot just ensures the
  // faction pages and audit feeds have someone visible to reference.
  for (const c of characters_seed) {
    await db.insert(schema.characters).values({
      playerDiscordId: "seed-bot",
      factionId: c.factionId,
      name: c.name,
      race: c.race,
      title: c.title,
      birthYearRp: c.birthYearRp,
      status: "active",
      woundScore: c.woundScore,
      influence: c.influence,
      currentRegionId: c.currentRegionId,
      biography: c.biography,
    });
  }

  // Capital settlements get a baseline district loadout. Look up each
  // settlement's id by name + region so we don't have to track autoinc IDs.
  const allSettlements = await db.select().from(schema.settlements);
  const settlementByName = new Map(allSettlements.map((s) => [s.name, s]));

  for (const d of districts_seed) {
    const s = settlementByName.get(d.settlementName);
    if (!s) continue;
    await db.insert(schema.districts).values({
      settlementId: s.id,
      districtType: d.districtType,
      category: d.category,
      popCost: d.popCost,
      active: "true",
    });
  }

  // Unit stacks garrisoned at the capital settlements.
  for (const u of units_seed) {
    const s = settlementByName.get(u.garrisonedAtName);
    if (!s) continue;
    await db.insert(schema.units).values({
      unitType: u.unitType,
      factionId: u.factionId,
      count: u.count,
      garrisonedAt: s.id,
    });
  }

  // Resource stocks per faction. Coin lives on factions.treasury_coin, not
  // here, so this seed covers commodities only.
  for (const r of resourceStocks_seed) {
    await db
      .insert(schema.resourceStocks)
      .values({
        factionId: r.factionId,
        resourceId: r.resourceId,
        quantity: r.quantity,
      })
      .onConflictDoUpdate({
        target: [
          schema.resourceStocks.factionId,
          schema.resourceStocks.resourceId,
        ],
        set: { quantity: r.quantity },
      });
  }

  // Bump some faction treasuries so the dashboards show realistic numbers.
  for (const [factionId, coin, dp] of treasury_seed) {
    await db
      .update(schema.factions)
      .set({ treasuryCoin: coin, treasuryDp: dp })
      .where(sqlOp`${schema.factions.id} = ${factionId}`);
  }

  console.log("Seeding diplomatic states…");
  // Match the existing audit events: Mordor at war with Gondor (declared
  // 1 day ago in seed-time), Rohan allied with Gondor (pledged just now).
  // Wipe + re-insert; deterministic across seed runs.
  await db.execute(sqlOp`DELETE FROM game.diplomatic_states`);
  const nowMs = Date.now();
  await db.insert(schema.diplomaticStates).values([
    {
      stateType: "war",
      factionAId: "mordor",
      factionBId: "gondor",
      status: "active",
      initiatedByFactionId: "mordor",
      reason: "Border raids in Ithilien",
      dpCost: 800,
      startedAt: new Date(nowMs - 1 * 24 * 60 * 60 * 1000),
    },
    {
      stateType: "alliance_basic",
      factionAId: "rohan",
      factionBId: "gondor",
      status: "active",
      initiatedByFactionId: "rohan",
      reason: "Oath of Eorl",
      dpCost: 1200,
      startedAt: new Date(nowMs - 8 * 60 * 1000),
    },
    {
      stateType: "trade_deal",
      factionAId: "erebor",
      factionBId: "dale",
      status: "active",
      initiatedByFactionId: "erebor",
      reason: "Iron and gems out, food and cloth in — the long lake compact.",
      dpCost: 600,
      startedAt: new Date(nowMs - 5 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("Seeding wiki pages…");
  for (const w of wikiPages) {
    await db
      .insert(schema.wikiPages)
      .values({
        slug: w.slug,
        title: w.title,
        body: w.body,
        visibility: "public",
        published: true,
        metadata: { category: w.category },
      })
      .onConflictDoUpdate({
        target: schema.wikiPages.slug,
        set: {
          title: w.title,
          body: w.body,
          metadata: { category: w.category },
        },
      });
  }

  const factionCount = await db.select().from(schema.factions);
  const regionCount = await db.select().from(schema.regions);
  const settlementCount = await db.select().from(schema.settlements);
  const eventCount = await db.select().from(schema.events);
  const wikiCount = await db.select().from(schema.wikiPages);

  console.log(
    `✓ Seed complete: ${factionCount.length} factions, ${regionCount.length} regions, ${settlementCount.length} settlements, ${eventCount.length} events, ${wikiCount.length} wiki pages.`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
