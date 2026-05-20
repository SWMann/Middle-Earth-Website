import { eq } from "drizzle-orm";
import { auth as nextAuth } from "@/auth";
import type { Session } from "next-auth";
import { db, schema } from "./db";

/**
 * Wrapper around NextAuth's `auth()` that swallows session-decode errors and
 * returns null. This happens when the user holds a session cookie signed by a
 * previous AUTH_SECRET — Auth.js otherwise throws JWTSessionError out into
 * the render path. Treating it as "no session" lets pages render, and the
 * user just needs to sign in again.
 */
export async function safeAuth(): Promise<Session | null> {
  try {
    return await nextAuth();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("safeAuth: ignoring session error", err);
    }
    return null;
  }
}

/**
 * Look up whether a Discord account has a Minecraft account linked.
 *
 * Queries the DB on every call. With JWT-strategy sessions we cannot refresh
 * a cached flag after the user redeems a link code (the cookie would still
 * say "not linked" until the next sign-in), so it's simpler and correct to
 * just hit the DB. At Phase 1 traffic this is free.
 */
export async function lookupMcLink(
  discordId: string,
): Promise<{ mcUuid: string; mcUsername: string } | null> {
  const rows = await db
    .select({
      mcUuid: schema.mcLinks.mcUuid,
      mcUsername: schema.mcLinks.mcUsername,
    })
    .from(schema.mcLinks)
    .where(eq(schema.mcLinks.discordId, discordId))
    .limit(1);
  return rows[0] ?? null;
}
