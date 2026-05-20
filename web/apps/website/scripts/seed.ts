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
