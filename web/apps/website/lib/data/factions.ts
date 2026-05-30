import "server-only";
import { cache } from "react";
import { eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Per-request memoised lookups. React.cache de-dupes calls within a single
 * render pass — so rendering N <FactionTag>s on a page hits the DB once
 * per distinct id, not N times.
 */

export const getFaction = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.factions)
    .where(eq(schema.factions.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const getAllFactions = cache(async () => {
  return await db.select().from(schema.factions).orderBy(schema.factions.displayName);
});

export const getMajorFactions = cache(async () => {
  return await db
    .select()
    .from(schema.factions)
    .where(isNull(schema.factions.parentFactionId))
    .orderBy(schema.factions.displayName);
});

export const getSubfactions = cache(async (parentFactionId: string) => {
  return await db
    .select()
    .from(schema.factions)
    .where(eq(schema.factions.parentFactionId, parentFactionId))
    .orderBy(schema.factions.displayName);
});

export const getRegionsClaimedBy = cache(async (factionId: string) => {
  // Join region_claims → regions so callers get the full Region rows back,
  // sorted by ID for stable rendering.
  return await db
    .select({
      id: schema.regions.id,
      displayName: schema.regions.displayName,
      biome: schema.regions.biome,
      centreX: schema.regions.centreX,
      centreZ: schema.regions.centreZ,
    })
    .from(schema.regionClaims)
    .innerJoin(schema.regions, eq(schema.regionClaims.regionId, schema.regions.id))
    .where(eq(schema.regionClaims.factionId, factionId))
    .orderBy(schema.regions.id);
});

export const getSettlementsByFaction = cache(async (factionId: string) => {
  return await db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.factionId, factionId))
    .orderBy(schema.settlements.name);
});

export const getUnitsByFaction = cache(async (factionId: string) => {
  return await db
    .select()
    .from(schema.units)
    .where(eq(schema.units.factionId, factionId))
    .orderBy(schema.units.unitType);
});

export const getResourceStocksByFaction = cache(async (factionId: string) => {
  return await db
    .select()
    .from(schema.resourceStocks)
    .where(eq(schema.resourceStocks.factionId, factionId))
    .orderBy(schema.resourceStocks.resourceId);
});
