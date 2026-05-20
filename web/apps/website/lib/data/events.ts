import "server-only";
import { cache } from "react";
import { desc, eq, and, or, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Event } from "@/lib/db/schema/audit";

type GetEventsOpts = {
  visibility?: ("public" | "faction" | "admin")[];
  factionId?: string;
  /**
   * When true with factionId, also match events where the faction is
   * referenced in the JSON payload (`against`, `with`, `target`) — not
   * just where it's the actor. Useful for the "events involving Gondor"
   * view on /factions/gondor when Gondor isn't the one acting.
   */
  touching?: boolean;
  limit?: number;
};

export const getRecentEvents = cache(async (opts: GetEventsOpts = {}): Promise<Event[]> => {
  const visibility = opts.visibility ?? ["public"];
  const limit = opts.limit ?? 10;

  let where = inArray(schema.events.visibility, visibility);

  if (opts.factionId) {
    if (opts.touching) {
      // payload->>'<key>' = 'factionId' across the keys we know to use.
      // Postgres JSON text-extract is fine here; the audit table is small
      // per faction and the type/faction indexes still get used.
      const fid = opts.factionId;
      const touches = or(
        eq(schema.events.factionId, fid),
        sql`(${schema.events.payload}->>'against') = ${fid}`,
        sql`(${schema.events.payload}->>'with') = ${fid}`,
        sql`(${schema.events.payload}->>'target') = ${fid}`,
      );
      where = and(where, touches)!;
    } else {
      where = and(where, eq(schema.events.factionId, opts.factionId))!;
    }
  }

  return await db
    .select()
    .from(schema.events)
    .where(where)
    .orderBy(desc(schema.events.occurredAt))
    .limit(limit);
});
