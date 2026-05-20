import Link from "next/link";
import {
  getAllFactions,
  getRegionsClaimedBy,
  getSettlementsByFaction,
} from "@/lib/data/factions";

export const revalidate = 60;

export const metadata = {
  title: "Factions — Middle-earth",
  description: "The major and minor factions playing on the server.",
};

export default async function FactionsIndexPage() {
  const all = await getAllFactions();
  const majors = all.filter((f) => !f.parentFactionId);
  const subs = all.filter((f) => f.parentFactionId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-12">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          The world in play
        </p>
        <h1 className="text-3xl font-semibold">Factions</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          The canon powers of Middle-earth. Major factions hold capitals;
          subfactions are player-led regional powers operating within a major
          faction&apos;s territory.
        </p>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
          Major factions
        </h2>
        <ul className="grid sm:grid-cols-2 gap-4">
          {majors.map((f) => (
            <FactionCard key={f.id} faction={f} />
          ))}
        </ul>
      </section>

      {subs.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
            Subfactions
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {subs.map((f) => (
              <FactionCard key={f.id} faction={f} isSubfaction />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function FactionCard({
  faction: f,
  isSubfaction,
}: {
  faction: Awaited<ReturnType<typeof getAllFactions>>[number];
  isSubfaction?: boolean;
}) {
  // Stats are per-card; the cache() wrappers de-dupe across renders.
  const [regions, settlements] = await Promise.all([
    getRegionsClaimedBy(f.id),
    getSettlementsByFaction(f.id),
  ]);

  return (
    <li>
      <Link
        href={{ pathname: `/factions/${f.id}` }}
        className="block rounded-lg border border-stone-200 dark:border-stone-800 p-5 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
      >
        <div className="flex items-baseline gap-2 mb-2">
          {f.bannerHex && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm border border-stone-300 dark:border-stone-700 shrink-0"
              style={{ backgroundColor: f.bannerHex }}
            />
          )}
          <h3 className="text-lg font-semibold">{f.displayName}</h3>
          <span className="ml-auto text-xs text-stone-500 shrink-0">
            {alignmentLabel(f.alignment)}
          </span>
        </div>

        {isSubfaction && f.parentFactionId && (
          <p className="text-xs text-stone-500 mb-3">
            within {f.parentFactionId}
          </p>
        )}

        <p className="text-sm opacity-80 leading-relaxed line-clamp-3 mb-4">
          {f.loreSummary || <em className="opacity-60">No lore summary yet.</em>}
        </p>

        <dl className="flex gap-6 text-xs">
          <div>
            <dt className="opacity-60">Regions</dt>
            <dd className="font-semibold tabular-nums">{regions.length}</dd>
          </div>
          <div>
            <dt className="opacity-60">Settlements</dt>
            <dd className="font-semibold tabular-nums">{settlements.length}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

function alignmentLabel(a: string): string {
  if (a === "good") return "Free Peoples";
  if (a === "evil") return "Servants of Shadow";
  return "Unaligned";
}
