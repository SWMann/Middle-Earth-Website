import "server-only";
import { cache } from "react";
import { desc, eq, and, or, gt, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveCharacterForPlayer } from "@/lib/data/characters";
import type { Event } from "@/lib/db/schema/audit";

export type NotificationFeed = {
  events: Event[];
  unreadCount: number;
  lastViewedAt: Date | null;
};

/**
 * Fetch the bell-icon feed for a logged-in user.
 *
 * "Notifications" = events touching the user's character's faction
 * (faction-scoped + public visibility). Unread = events with occurredAt
 * later than the user's last view.
 *
 * If the user has no character yet, returns an empty feed — the bell
 * just sits there until they have a faction to follow.
 */
export const getNotificationsForUser = cache(
  async (discordId: string, limit = 10): Promise<NotificationFeed> => {
    const character = await getActiveCharacterForPlayer(discordId);
    if (!character) {
      return { events: [], unreadCount: 0, lastViewedAt: null };
    }

    const accountRows = await db
      .select({ lastViewedAt: schema.accounts.lastNotificationsViewedAt })
      .from(schema.accounts)
      .where(eq(schema.accounts.discordId, discordId))
      .limit(1);
    const lastViewedAt = accountRows[0]?.lastViewedAt ?? null;

    const factionId = character.factionId;
    const touches = or(
      eq(schema.events.factionId, factionId),
      sql`(${schema.events.payload}->>'against') = ${factionId}`,
      sql`(${schema.events.payload}->>'with') = ${factionId}`,
      sql`(${schema.events.payload}->>'target') = ${factionId}`,
    );

    const events = await db
      .select()
      .from(schema.events)
      .where(
        and(
          inArray(schema.events.visibility, ["public", "faction"]),
          touches,
        ),
      )
      .orderBy(desc(schema.events.occurredAt))
      .limit(limit);

    const unreadCount = lastViewedAt
      ? (
          await db
            .select({ c: sql<number>`count(*)::int` })
            .from(schema.events)
            .where(
              and(
                inArray(schema.events.visibility, ["public", "faction"]),
                touches,
                gt(schema.events.occurredAt, lastViewedAt),
              ),
            )
        )[0]?.c ?? 0
      : events.length;

    return { events, unreadCount, lastViewedAt };
  },
);
