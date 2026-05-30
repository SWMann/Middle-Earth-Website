import "server-only";
import { cache } from "react";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const getCharacter = cache(async (id: number) => {
  const rows = await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const getAllCharacterIds = cache(async () => {
  const rows = await db
    .select({ id: schema.characters.id })
    .from(schema.characters);
  return rows.map((r) => r.id);
});

export const getAllActiveCharacters = cache(async () => {
  return await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.status, "active"))
    .orderBy(schema.characters.factionId, schema.characters.name);
});

export const getCharactersByFaction = cache(async (factionId: string) => {
  return await db
    .select()
    .from(schema.characters)
    .where(
      and(
        eq(schema.characters.factionId, factionId),
        eq(schema.characters.status, "active"),
      ),
    )
    .orderBy(schema.characters.influence);
});

/**
 * Find the active character for a logged-in player. Returns null if the
 * player hasn't created one yet — that's the normal state for a new user.
 */
export const getActiveCharacterForPlayer = cache(
  async (discordId: string) => {
    const rows = await db
      .select()
      .from(schema.characters)
      .where(
        and(
          eq(schema.characters.playerDiscordId, discordId),
          eq(schema.characters.status, "active"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },
);
