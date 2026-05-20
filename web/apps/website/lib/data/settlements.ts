import "server-only";
import { cache } from "react";
import { eq, ne, and } from "drizzle-orm";
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
