import Link from "next/link";
import { getAllUnitTypes } from "@/lib/data/catalogue";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";

export const revalidate = 600;

export const metadata = {
  title: "Units — Middle-earth",
  description: "Military units of the factions.",
};

export default async function UnitsIndexPage() {
  const units = await getAllUnitTypes();

  // Group by faction. Null = "Standard (any faction)".
  const byFaction = new Map<string | null, typeof units>();
  for (const u of units) {
    if (!byFaction.has(u.factionId)) byFaction.set(u.factionId, []);
    byFaction.get(u.factionId)!.push(u);
  }

  // Standard first, then named factions sorted alphabetically.
  const factionEntries = [...byFaction.entries()];
  factionEntries.sort(([a], [b]) => {
    if (a === null) return -1;
    if (b === null) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Units</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          Military units that can be recruited at settlements with the right
          tier and supplies. Standard units are available to any faction;
          named units belong to a specific roster.
        </p>
      </header>

      {factionEntries.map(async ([fid, list]) => {
        const faction = fid ? await getFaction(fid) : null;
        const label = faction ? faction.displayName : "Standard";
        return (
          <section key={fid ?? "standard"}>
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3 flex items-baseline gap-2">
              {faction ? <FactionTag factionId={faction.id} /> : label}
              <span className="text-xs opacity-60">{list.length} unit{list.length === 1 ? "" : "s"}</span>
            </h2>
            <ul className="space-y-2">
              {list.map((u) => (
                <li
                  key={u.id}
                  className="rounded border border-stone-200 dark:border-stone-800 p-4"
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <Link
                      href={{ pathname: `/units/${u.id}` }}
                      className="text-base font-semibold hover:underline"
                    >
                      {u.displayName}
                    </Link>
                    <span className="font-mono text-xs text-stone-500">
                      {u.category}
                    </span>
                    <span className="text-xs text-stone-500">
                      tier {u.tierRequired}+
                    </span>
                    <span className="ml-auto text-xs text-stone-500 tabular-nums">
                      {u.coinCost} coin · hp {u.health} · armor {u.armor} · morale {u.morale}
                    </span>
                  </div>
                  {u.description && (
                    <p className="text-sm opacity-70 mt-2">{u.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/resources" }} className="underline">
          Resources
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/districts" }} className="underline">
          Districts
        </Link>
      </footer>
    </div>
  );
}
