import Link from "next/link";
import { getAllDistrictTypes } from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Districts — Middle-earth",
  description: "What can be built at a settlement.",
};

const CATEGORY_ORDER = [
  "residential",
  "agricultural",
  "extraction",
  "industrial",
  "artisanal",
  "trade",
  "luxury",
  "military",
  "defensive",
  "governance",
  "wagon",
  "unique",
];

export default async function DistrictsIndexPage() {
  const districts = await getAllDistrictTypes();
  const byCategory = new Map<string, typeof districts>();
  for (const d of districts) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, []);
    byCategory.get(d.category)!.push(d);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Districts</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          The building blocks of every settlement. Each district consumes
          tagged inputs and produces resources or services. Tier and cost
          constraints decide where each can be built.
        </p>
      </header>

      {orderedCategories.map((category) => {
        const list = byCategory.get(category) ?? [];
        return (
          <section key={category}>
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3">
              {category}
            </h2>
            <ul className="space-y-2">
              {list.map((d) => (
                <li
                  key={d.id}
                  className="rounded border border-stone-200 dark:border-stone-800 p-4"
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <Link
                      href={{ pathname: `/districts/${d.id}` }}
                      className="text-base font-semibold hover:underline"
                    >
                      {d.displayName}
                    </Link>
                    <span className="font-mono text-xs text-stone-500">
                      {d.id}
                    </span>
                    <span className="ml-auto text-xs text-stone-500 tabular-nums">
                      tier {d.tierMin}+ · pop {d.popCost}
                      {d.populationCapProvided > 0 && (
                        <> · cap +{d.populationCapProvided}</>
                      )}
                    </span>
                  </div>
                  {d.description && (
                    <p className="text-sm opacity-70 mt-2">{d.description}</p>
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
        <Link href={{ pathname: "/units" }} className="underline">
          Units
        </Link>
      </footer>
    </div>
  );
}
