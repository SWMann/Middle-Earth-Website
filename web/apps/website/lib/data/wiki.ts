import "server-only";
import { cache } from "react";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type WikiPage = typeof schema.wikiPages.$inferSelect;

export const getPage = cache(async (slug: string): Promise<WikiPage | null> => {
  const rows = await db
    .select()
    .from(schema.wikiPages)
    .where(eq(schema.wikiPages.slug, slug))
    .limit(1);
  return rows[0] ?? null;
});

export const getPublishedPages = cache(async (): Promise<WikiPage[]> => {
  return await db
    .select()
    .from(schema.wikiPages)
    .where(
      and(
        eq(schema.wikiPages.published, true),
        eq(schema.wikiPages.visibility, "public"),
      ),
    )
    .orderBy(schema.wikiPages.title);
});

/**
 * Group published pages by their metadata.category. Pages without a
 * category land in "Uncategorised". Returned as an ordered list of
 * sections so callers can render the wiki with a stable layout.
 */
export const getWikiSections = cache(async () => {
  const pages = await getPublishedPages();
  const byCategory = new Map<string, WikiPage[]>();
  for (const p of pages) {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    const cat =
      typeof meta.category === "string" ? meta.category : "Uncategorised";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }
  // Stable category order: known ones first, then anything else alphabetical.
  const KNOWN_ORDER = [
    "Getting Started",
    "Mechanics",
    "Factions",
    "Lore",
    "Uncategorised",
  ];
  const known = KNOWN_ORDER.filter((c) => byCategory.has(c));
  const unknown = [...byCategory.keys()]
    .filter((c) => !KNOWN_ORDER.includes(c))
    .sort();
  return [...known, ...unknown].map((cat) => ({
    category: cat,
    pages: byCategory.get(cat)!,
  }));
});

/** Read the admin allowlist from env. Comma-separated Discord IDs. */
export function isAdmin(discordId: string | undefined): boolean {
  if (!discordId) return false;
  const raw = process.env.ADMIN_DISCORD_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(discordId);
}
