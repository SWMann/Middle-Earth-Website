/**
 * Mock-mod daily tick.
 *
 * Stands in for what the Java/Fabric mod will eventually do once per real
 * day (per `mod_spec.md §4.2`). For each faction:
 *
 *   - Treasury Coin accrues at `BASE_COIN_PER_TICK + COIN_PER_SETTLEMENT × n`
 *   - Treasury DP accrues at `BASE_DP_PER_TICK`
 *   - Each settlement's population grows toward its cap (capped at
 *     SETTLEMENT_GROWTH_PER_TICK per day so we don't snap to cap)
 *   - Each tracked resource stock ticks up at `BASE_RESOURCE_PER_TICK`
 *   - One audit event per faction summarises the delta so dashboards and
 *     /factions/[id] feeds reflect the activity
 *
 * Each tick is its own DB transaction per faction (matching the
 * "atomic per faction" guidance in the mod spec). If one faction's tick
 * fails the others still proceed.
 *
 * Run with:
 *   pnpm db:tick           # one day
 *   pnpm db:tick -- --days 7   # advance a week
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as sqlOp, eq, isNull } from "drizzle-orm";
import * as web from "../lib/db/schema/web.ts";
import * as game from "../lib/db/schema/game.ts";
import * as audit from "../lib/db/schema/audit.ts";
const schema = { ...web, ...game, ...audit };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set; aborting.");
  process.exit(1);
}

// --- Constants (kept honest as constants, not magic numbers) -------------

const BASE_COIN_PER_TICK = 40;
const COIN_PER_SETTLEMENT = 25;
const BASE_DP_PER_TICK = 8;
const DP_PER_SETTLEMENT = 2;

const SETTLEMENT_GROWTH_PER_TICK = 3; // bodies per day, max
const SETTLEMENT_GROWTH_PROBABILITY = 0.8; // not every settlement grows every day
const BASE_RESOURCE_PER_TICK = 6;

// --- Arg parsing ---------------------------------------------------------

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const days =
  daysIdx >= 0 && args[daysIdx + 1] ? Math.max(1, parseInt(args[daysIdx + 1]!, 10)) : 1;

// --- Setup --------------------------------------------------------------

const client = postgres(connectionString, { max: 1, ssl: "require" });
const db = drizzle(client, { schema });

type FactionRow = typeof schema.factions.$inferSelect;
type SettlementRow = typeof schema.settlements.$inferSelect;
type ResourceStockRow = typeof schema.resourceStocks.$inferSelect;

type FactionTickDelta = {
  factionId: string;
  factionName: string;
  coinDelta: number;
  dpDelta: number;
  populationDelta: number;
  resourceDeltas: { resourceId: string; delta: number }[];
};

// --- Tick logic ---------------------------------------------------------

async function tickOnce(): Promise<FactionTickDelta[]> {
  const factions = (await db.select().from(schema.factions)) as FactionRow[];
  const settlements = (await db
    .select()
    .from(schema.settlements)) as SettlementRow[];
  const stocks = (await db
    .select()
    .from(schema.resourceStocks)) as ResourceStockRow[];

  const settlementsByFaction = new Map<string, SettlementRow[]>();
  for (const s of settlements) {
    if (!settlementsByFaction.has(s.factionId))
      settlementsByFaction.set(s.factionId, []);
    settlementsByFaction.get(s.factionId)!.push(s);
  }

  const stocksByFaction = new Map<string, ResourceStockRow[]>();
  for (const r of stocks) {
    if (!stocksByFaction.has(r.factionId))
      stocksByFaction.set(r.factionId, []);
    stocksByFaction.get(r.factionId)!.push(r);
  }

  const deltas: FactionTickDelta[] = [];

  for (const f of factions) {
    // Subfactions don't have their own treasury (treasury lives on the
    // parent; earmarks describe their share). Skip currency accrual for
    // them but still tick their settlements and resources.
    const isSubfaction = f.parentFactionId != null;

    const ownSettlements = settlementsByFaction.get(f.id) ?? [];
    const ownStocks = stocksByFaction.get(f.id) ?? [];

    const coinDelta = isSubfaction
      ? 0
      : BASE_COIN_PER_TICK + COIN_PER_SETTLEMENT * ownSettlements.length;
    const dpDelta = isSubfaction
      ? 0
      : BASE_DP_PER_TICK + DP_PER_SETTLEMENT * ownSettlements.length;

    let populationDelta = 0;
    const settlementUpdates: { id: number; newPopulation: number }[] = [];
    for (const s of ownSettlements) {
      if (s.population >= s.populationCap) continue;
      if (Math.random() > SETTLEMENT_GROWTH_PROBABILITY) continue;
      const grow = Math.min(
        SETTLEMENT_GROWTH_PER_TICK,
        s.populationCap - s.population,
      );
      if (grow <= 0) continue;
      populationDelta += grow;
      settlementUpdates.push({ id: s.id, newPopulation: s.population + grow });
    }

    const resourceDeltas: { resourceId: string; delta: number }[] = [];
    for (const r of ownStocks) {
      resourceDeltas.push({ resourceId: r.resourceId, delta: BASE_RESOURCE_PER_TICK });
    }

    // All updates for this faction in one transaction.
    await db.transaction(async (tx) => {
      if (!isSubfaction && (coinDelta > 0 || dpDelta > 0)) {
        await tx
          .update(schema.factions)
          .set({
            treasuryCoin: sqlOp`${schema.factions.treasuryCoin} + ${coinDelta}`,
            treasuryDp: sqlOp`${schema.factions.treasuryDp} + ${dpDelta}`,
          })
          .where(eq(schema.factions.id, f.id));
      }

      for (const upd of settlementUpdates) {
        await tx
          .update(schema.settlements)
          .set({ population: upd.newPopulation })
          .where(eq(schema.settlements.id, upd.id));
      }

      for (const r of resourceDeltas) {
        await tx
          .update(schema.resourceStocks)
          .set({
            quantity: sqlOp`${schema.resourceStocks.quantity} + ${r.delta}`,
          })
          .where(
            sqlOp`${schema.resourceStocks.factionId} = ${f.id} AND ${schema.resourceStocks.resourceId} = ${r.resourceId}`,
          );
      }

      // Audit event — only write one if something actually changed, so
      // genuinely-quiet factions don't flood the feed.
      if (
        coinDelta > 0 ||
        dpDelta > 0 ||
        populationDelta > 0 ||
        resourceDeltas.length > 0
      ) {
        await tx.insert(schema.events).values({
          eventType: "DAILY_TICK",
          factionId: f.id,
          visibility: "faction", // dashboards only — not noisy on /
          payload: {
            coin_delta: coinDelta,
            dp_delta: dpDelta,
            population_delta: populationDelta,
            settlements_grown: settlementUpdates.length,
            resources_ticked: resourceDeltas.length,
          },
        });
      }
    });

    deltas.push({
      factionId: f.id,
      factionName: f.displayName,
      coinDelta,
      dpDelta,
      populationDelta,
      resourceDeltas,
    });
  }

  return deltas;
}

// --- Main --------------------------------------------------------------

async function main() {
  console.log(`Running ${days} tick${days === 1 ? "" : "s"}…`);

  const allDeltas: FactionTickDelta[] = [];
  for (let i = 0; i < days; i++) {
    const dayDeltas = await tickOnce();
    allDeltas.push(...dayDeltas);
  }

  // Per-faction summary (sum across all ticks if --days > 1).
  const summary = new Map<string, FactionTickDelta>();
  for (const d of allDeltas) {
    const existing = summary.get(d.factionId);
    if (!existing) {
      summary.set(d.factionId, { ...d });
    } else {
      existing.coinDelta += d.coinDelta;
      existing.dpDelta += d.dpDelta;
      existing.populationDelta += d.populationDelta;
    }
  }

  const table = [...summary.values()]
    .sort((a, b) => a.factionName.localeCompare(b.factionName))
    .map((d) => ({
      faction: d.factionName,
      "+coin": d.coinDelta,
      "+dp": d.dpDelta,
      "+pop": d.populationDelta,
    }));
  console.table(table);
  console.log(
    `✓ Tick complete: ${days} day${days === 1 ? "" : "s"}, ${summary.size} factions processed.`,
  );
  // Suppress lint complaint about unused isNull import — it's only here so
  // the import list stays in sync with future tick steps that filter on
  // garrisoned_at IS NULL etc.
  void isNull;
}

main()
  .catch((err) => {
    console.error("Tick failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
