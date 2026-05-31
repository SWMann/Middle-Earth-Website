import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const getRegion = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.regions)
    .where(eq(schema.regions.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const getRegionClaim = cache(async (regionId: string) => {
  const rows = await db
    .select()
    .from(schema.regionClaims)
    .where(eq(schema.regionClaims.regionId, regionId))
    .limit(1);
  return rows[0] ?? null;
});

export const getAllRegionsWithClaims = cache(async () => {
  // LEFT JOIN so unclaimed regions still come back.
  return await db
    .select({
      id: schema.regions.id,
      displayName: schema.regions.displayName,
      biome: schema.regions.biome,
      claimedByFactionId: schema.regionClaims.factionId,
    })
    .from(schema.regions)
    .leftJoin(
      schema.regionClaims,
      eq(schema.regions.id, schema.regionClaims.regionId),
    )
    .orderBy(schema.regions.id);
});
