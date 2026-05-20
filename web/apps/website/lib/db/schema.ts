/**
 * The `web.*` schema, owned by the website.
 *
 * The mod has read-only access to these tables (it joins on web.mc_links to
 * resolve a connecting Minecraft UUID to a Discord account). The website
 * never writes to game.* tables — that's the mod's job over its HTTP API.
 *
 * Mod-spec reference: §2.3, §3.1.
 *
 * Note on Discord IDs: the mod spec defines `discord_id` as BIGINT.
 * Drizzle's pg `bigint` columns only model JS number/bigint — both of which
 * either lose precision (snowflakes exceed 2^53) or serialize awkwardly
 * across the JSON boundary. We store them as TEXT here, which is what most
 * Discord-using apps do in practice. If the size matters later, migrate
 * to BIGINT with a bigint-mode column and a serialisation shim.
 */

import {
  pgSchema,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

export const web = pgSchema("web");

export const accounts = web.table("accounts", {
  discordId: text("discord_id").primaryKey(),
  discordUsername: text("discord_username").notNull(),
  discordAvatar: text("discord_avatar"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const mcLinks = web.table("mc_links", {
  mcUuid: uuid("mc_uuid").primaryKey(),
  discordId: text("discord_id")
    .notNull()
    .references(() => accounts.discordId),
  mcUsername: text("mc_username").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull(),
  unlinkedAt: timestamp("unlinked_at", { withTimezone: true }),
});

export const sessions = web.table("sessions", {
  sessionId: text("session_id").primaryKey(),
  discordId: text("discord_id")
    .notNull()
    .references(() => accounts.discordId),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationState = web.table(
  "notification_state",
  {
    discordId: text("discord_id")
      .notNull()
      .references(() => accounts.discordId),
    eventId: text("event_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.discordId, t.eventId] }),
  }),
);

export const wikiPages = web.table("wiki_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  visibility: text("visibility").notNull().default("public"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => accounts.discordId),
  published: boolean("published").notNull().default(false),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type McLink = typeof mcLinks.$inferSelect;
export type NewMcLink = typeof mcLinks.$inferInsert;
