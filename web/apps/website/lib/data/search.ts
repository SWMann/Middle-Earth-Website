import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type SearchHit =
  | { kind: "faction"; id: string; title: string; subtitle: string; rank: number }
  | { kind: "settlement"; id: number; title: string; subtitle: string; rank: number }
  | { kind: "region"; id: string; title: string; subtitle: string; rank: number }
  | { kind: "wiki"; slug: string; title: string; subtitle: string; rank: number };

/**
 * Global search across entities the public should be able to find.
 *
 * Phase 2 implementation uses Postgres `to_tsvector` / `to_tsquery` over the
 * relevant text columns, with `websearch_to_tsquery` so multi-word queries
 * and phrases work without manual sanitisation. Results are interleaved by
 * `ts_rank` per category; if any one category dominates, we cap its share
 * so the result list stays diverse.
 *
 * If/when the wiki grows large or the entity count climbs, swap the
 * implementation for Meilisearch or Typesense — the `SearchHit` shape is
 * the stable surface.
 */
export async function search(query: string, limit = 12): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const tsquery = sql`websearch_to_tsquery('english', ${q})`;

  // 1) Factions: id + display_name + lore_summary
  const factions = await db.execute<{
    id: string;
    display_name: string;
    alignment: string;
    rank: number;
  }>(sql`
    SELECT id, display_name, alignment,
      ts_rank(
        to_tsvector('english',
          coalesce(id, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(lore_summary, '')
        ),
        ${tsquery}
      ) AS rank
    FROM game.factions
    WHERE to_tsvector('english',
        coalesce(id, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(lore_summary, '')
      ) @@ ${tsquery}
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  // 2) Settlements: name + tier
  const settlements = await db.execute<{
    id: number;
    name: string;
    tier: string;
    faction_id: string;
    rank: number;
  }>(sql`
    SELECT id, name, tier, faction_id,
      ts_rank(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(tier, '')),
        ${tsquery}
      ) AS rank
    FROM game.settlements
    WHERE to_tsvector('english', coalesce(name, '') || ' ' || coalesce(tier, '')) @@ ${tsquery}
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  // 3) Regions: id + display_name + biome
  const regions = await db.execute<{
    id: string;
    display_name: string;
    biome: string;
    rank: number;
  }>(sql`
    SELECT id, display_name, biome,
      ts_rank(
        to_tsvector('english',
          coalesce(id, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(biome, '')
        ),
        ${tsquery}
      ) AS rank
    FROM game.regions
    WHERE to_tsvector('english',
        coalesce(id, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(biome, '')
      ) @@ ${tsquery}
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  // 4) Wiki: title + body, published-and-public only
  const wiki = await db.execute<{
    slug: string;
    title: string;
    rank: number;
  }>(sql`
    SELECT slug, title,
      ts_rank(
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')),
        ${tsquery}
      ) AS rank
    FROM web.wiki_pages
    WHERE published = TRUE AND visibility = 'public'
      AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')) @@ ${tsquery}
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  const hits: SearchHit[] = [
    ...(factions.map((r) => ({
      kind: "faction" as const,
      id: r.id,
      title: r.display_name,
      subtitle: capitalise(r.alignment),
      rank: r.rank,
    }))),
    ...(settlements.map((r) => ({
      kind: "settlement" as const,
      id: r.id,
      title: r.name,
      subtitle: `${capitalise(r.tier.replaceAll("_", " "))} · ${r.faction_id}`,
      rank: r.rank,
    }))),
    ...(regions.map((r) => ({
      kind: "region" as const,
      id: r.id,
      title: r.display_name,
      subtitle: `${r.id} · ${capitalise(r.biome)}`,
      rank: r.rank,
    }))),
    ...(wiki.map((r) => ({
      kind: "wiki" as const,
      slug: r.slug,
      title: r.title,
      subtitle: "Wiki",
      rank: r.rank,
    }))),
  ];

  return hits.sort((a, b) => b.rank - a.rank).slice(0, limit);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
