import Link from "next/link";
import { search, type SearchHit } from "@/lib/data/search";

export const metadata = {
  title: "Search — Middle-earth",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const hits = q.trim().length >= 2 ? await search(q, 20) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Search
        </p>
        <h1 className="text-2xl font-semibold">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : <>Search</>}
        </h1>
      </header>

      <form action="/search" method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search factions, settlements, regions, wiki…"
          autoFocus
          className="flex-1 rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-current px-4 py-2 text-sm hover:opacity-80"
        >
          Search
        </button>
      </form>

      {q.trim().length === 0 ? (
        <p className="text-sm opacity-60 italic">
          Type a query above. Searches factions, settlements, regions, and the
          wiki.
        </p>
      ) : q.trim().length < 2 ? (
        <p className="text-sm opacity-60 italic">
          Query needs at least two characters.
        </p>
      ) : hits.length === 0 ? (
        <p className="text-sm opacity-60 italic">
          No results for that query. Try a shorter or differently-spelled term.
        </p>
      ) : (
        <ul className="space-y-3">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.kind === "wiki" ? hit.slug : hit.id}`}>
              <Hit hit={hit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  const href = (() => {
    switch (hit.kind) {
      case "faction":
        return `/factions/${hit.id}`;
      case "settlement":
        return `/settlements/${hit.id}`;
      case "region":
        // No /regions/[id] page in Phase 2 — link to /map for now.
        return `/map`;
      case "wiki":
        return `/wiki/${hit.slug}`;
    }
  })();
  const kindLabel = (() => {
    switch (hit.kind) {
      case "faction":
        return "Faction";
      case "settlement":
        return "Settlement";
      case "region":
        return "Region";
      case "wiki":
        return "Wiki";
    }
  })();

  return (
    <Link
      href={{ pathname: href }}
      className="block rounded border border-stone-200 dark:border-stone-800 p-3 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-widest opacity-60 shrink-0 w-20">
          {kindLabel}
        </span>
        <div className="min-w-0">
          <div className="font-medium">{hit.title}</div>
          <div className="text-xs opacity-60">{hit.subtitle}</div>
        </div>
      </div>
    </Link>
  );
}
