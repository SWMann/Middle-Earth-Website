import "server-only";
import { cache } from "react";
import { desc, eq, and, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Event } from "@/lib/db/schema/audit";

type GetEventsOpts = {
  visibility?: ("public" | "faction" | "admin")[];
  factionId?: string;
  limit?: number;
};

export const getRecentEvents = cache(async (opts: GetEventsOpts = {}): Promise<Event[]> => {
  const visibility = opts.visibility ?? ["public"];
  const limit = opts.limit ?? 10;

  const where = opts.factionId
    ? and(
        inArray(schema.events.visibility, visibility),
        eq(schema.events.factionId, opts.factionId),
      )
    : inArray(schema.events.visibility, visibility);

  return await db
    .select()
    .from(schema.events)
    .where(where)
    .orderBy(desc(schema.events.occurredAt))
    .limit(limit);
});
