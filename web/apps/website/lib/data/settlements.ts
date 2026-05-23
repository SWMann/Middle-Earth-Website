import "server-only";
import { cache } from "react";
import { eq, ne, and, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const getSettlement = cache(async (id: number) => {
  const rows = await db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const countSettlements = cache(async () => {
  const rows = await db.select().from(schema.settlements);
  return rows.length;
});

export const getAllSettlementIds = cache(async () => {
  const rows = await db.select({ id: schema.settlements.id }).from(schema.settlements);
  return rows.map((r) => r.id);
});

export const getSiblingSettlements = cache(
  async (factionId: string, excludeId: number) => {
    return await db
      .select()
      .from(schema.settlements)
      .where(
        and(
          eq(schema.settlements.factionId, factionId),
          ne(schema.settlements.id, excludeId),
        ),
      )
      .orderBy(schema.settlements.name);
  },
);

export const getDistrictsAtSettlement = cache(async (settlementId: number) => {
  return await db
    .select()
    .from(schema.districts)
    .where(eq(schema.districts.settlementId, settlementId))
    .orderBy(schema.districts.category, schema.districts.districtType);
});

export const getUnitsGarrisonedAt = cache(async (settlementId: number) => {
  return await db
    .select()
    .from(schema.units)
    .where(
      and(
        eq(schema.units.garrisonedAt, settlementId),
        isNotNull(schema.units.garrisonedAt),
      ),
    )
    .orderBy(schema.units.unitType);
});
