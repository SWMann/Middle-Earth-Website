import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type MapRegion = {
  id: string;
  displayName: string;
  biome: string;
  centreX: number;
  centreZ: number;
  radiusBlocks: number;
  claim: { factionId: string; displayName: string; bannerHex: string | null } | null;
};

export type MapSettlement = {
  id: number;
  name: string;
  tier: string;
  regionId: string;
  factionId: string;
  factionDisplayName: string;
  centreX: number;
  centreZ: number;
};

/**
 * Single round-trip fetch of everything the world map needs.
 *
 * The map is the most-rendered surface on the site; cache() ensures that
 * even if /map and an embedded preview both call this in one request,
 * we only execute it once.
 */
export const getMapState = cache(async () => {
  // Left-joins so unclaimed regions still appear, just without a claim block.
  const regions = await db
    .select({
      id: schema.regions.id,
      displayName: schema.regions.displayName,
      biome: schema.regions.biome,
      centreX: schema.regions.centreX,
      centreZ: schema.regions.centreZ,
      radiusBlocks: schema.regions.radiusBlocks,
      claimFactionId: schema.regionClaims.factionId,
      claimFactionName: schema.factions.displayName,
      claimFactionColour: schema.factions.bannerHex,
    })
    .from(schema.regions)
    .leftJoin(
      schema.regionClaims,
      eq(schema.regions.id, schema.regionClaims.regionId),
    )
    .leftJoin(
      schema.factions,
      eq(schema.regionClaims.factionId, schema.factions.id),
    );

  const settlements = await db
    .select({
      id: schema.settlements.id,
      name: schema.settlements.name,
      tier: schema.settlements.tier,
      regionId: schema.settlements.regionId,
      factionId: schema.settlements.factionId,
      factionDisplayName: schema.factions.displayName,
      centreX: schema.settlements.centreX,
      centreZ: schema.settlements.centreZ,
    })
    .from(schema.settlements)
    .innerJoin(
      schema.factions,
      eq(schema.settlements.factionId, schema.factions.id),
    );

  const mapRegions: MapRegion[] = regions.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    biome: r.biome,
    centreX: r.centreX,
    centreZ: r.centreZ,
    radiusBlocks: r.radiusBlocks,
    claim: r.claimFactionId
      ? {
          factionId: r.claimFactionId,
          displayName: r.claimFactionName ?? r.claimFactionId,
          bannerHex: r.claimFactionColour,
        }
      : null,
  }));

  return { regions: mapRegions, settlements: settlements as MapSettlement[] };
});
