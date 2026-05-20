import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
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
