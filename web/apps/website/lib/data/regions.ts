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
