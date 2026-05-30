import Link from "next/link";
import { getAllActiveCharacters } from "@/lib/data/characters";
import { getFaction } from "@/lib/data/factions";
import { CharacterTag } from "@/components/tags/character-tag";
import { RegionTag } from "@/components/tags/region-tag";

export const revalidate = 120;

export const metadata = {
  title: "Characters — Middle-earth",
  description: "Notable characters across the factions.",
};

export default async function CharactersIndexPage() {
  const characters = await getAllActiveCharacters();

  // Group by faction, then resolve each faction once for the section header.
  const byFaction = new Map<string, typeof characters>();
  for (const c of characters) {
    if (!byFaction.has(c.factionId)) byFaction.set(c.factionId, []);
    byFaction.get(c.factionId)!.push(c);
  }

  const factions = await Promise.all(
    [...byFaction.keys()].map(async (id) => {
      const f = await getFaction(id);
      return { id, displayName: f?.displayName ?? id, bannerHex: f?.bannerHex ?? null };
    }),
  );
  factions.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-12">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          The world in play
        </p>
        <h1 className="text-3xl font-semibold">Characters</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          Active characters across all factions. Hover or click for the
          character sheet.
        </p>
      </header>

      {factions.map((f) => {
        const chars = byFaction.get(f.id) ?? [];
        return (
          <section key={f.id}>
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2">
              {f.bannerHex && (
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-sm border border-stone-300 dark:border-stone-700"
                  style={{ backgroundColor: f.bannerHex }}
                />
              )}
              <Link
                href={{ pathname: `/factions/${f.id}` }}
                className="hover:underline normal-case tracking-normal text-base font-semibold"
              >
                {f.displayName}
              </Link>
              <span className="text-xs opacity-60">
                {chars.length} active
              </span>
            </h2>
            <ul className="space-y-2 text-sm">
              {[...chars]
                .sort((a, b) => b.influence - a.influence)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-baseline gap-3 flex-wrap"
                  >
                    <CharacterTag characterId={c.id} />
                    <span className="text-xs text-stone-500">
                      {capitalise(c.race)}
                    </span>
                    <span className="text-xs text-stone-500 tabular-nums">
                      Inf {c.influence}
                    </span>
                    <span className="text-xs text-stone-500 tabular-nums">
                      Wnd {c.woundScore}
                    </span>
                    {c.currentRegionId && (
                      <span className="text-xs text-stone-500">
                        <RegionTag regionId={c.currentRegionId} idOnly />
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
