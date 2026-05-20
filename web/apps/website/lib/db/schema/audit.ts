/**
 * The `audit.*` schema — APPEND-ONLY, owned by the mod (and the seed
 * script during Phase 2 development). Rows are never updated or deleted.
 *
 * Every state-mutating operation in the mod writes one row in the same
 * transaction as the mutation. The website reads from here for the
 * AuditFeed component and for the per-faction history pages.
 *
 * Mod-spec reference: §3.3.
 */

import {
  pgSchema,
  text,
  timestamp,
  jsonb,
  bigserial,
  bigint,
  index,
} from "drizzle-orm/pg-core";

export const audit = pgSchema("audit");

export const events = audit.table(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventType: text("event_type").notNull(),
    factionId: text("faction_id"), // nullable: server-wide events
    characterId: bigint("character_id", { mode: "number" }), // nullable
    visibility: text("visibility").notNull().default("public"), // 'public' | 'faction' | 'admin'
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    causationId: bigint("causation_id", { mode: "number" }),
  },
  (t) => ({
    occurredAtIdx: index("events_occurred_at_idx").on(t.occurredAt),
    factionIdx: index("events_faction_idx").on(t.factionId, t.occurredAt),
    typeIdx: index("events_type_idx").on(t.eventType, t.occurredAt),
  }),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
