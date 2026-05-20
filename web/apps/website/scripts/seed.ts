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
const schema = { ...web, ...game, ...audit };

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

  const factionCount = await db.select().from(schema.factions);
  const regionCount = await db.select().from(schema.regions);
  const settlementCount = await db.select().from(schema.settlements);
  const eventCount = await db.select().from(schema.events);

  console.log(
    `✓ Seed complete: ${factionCount.length} factions, ${regionCount.length} regions, ${settlementCount.length} settlements, ${eventCount.length} events.`,
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
