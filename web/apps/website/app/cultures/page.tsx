import Link from "next/link";
import { getAllCultures, getFactionsForCulture } from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Cultures — Middle-earth",
  description:
    "The architectural cultures of Middle-earth. Each gives the same buildings a different name, flavour, and approved block palette.",
};

export default async function CulturesIndexPage() {
  const cultures = await getAllCultures();

  // Member factions per culture (small N — fine to fan out).
  const members = await Promise.all(
    cultures.map((c) => getFactionsForCulture(c.id)),
  );
  const membersById = new Map(cultures.map((c, i) => [c.id, members[i]]));

  const topLevel = cultures.filter((c) => !c.parentCultureId);
  const childrenOf = new Map<string, typeof cultures>();
  for (const c of cultures) {
    if (!c.parentCultureId) continue;
    if (!childrenOf.has(c.parentCultureId))
      childrenOf.set(c.parentCultureId, []);
    childrenOf.get(c.parentCultureId)!.push(c);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Cultures</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          A culture is an architectural identity — the style a group of factions
          builds in. Cultures are purely cosmetic: they change a building&apos;s{" "}
          <span className="font-medium">name</span>,{" "}
          <span className="font-medium">flavour</span>, and{" "}
          <span className="font-medium">approved block palette</span>, never its
          components or its role in a district. A Hearth Hall is a Hearth Hall
          everywhere; it simply wears Rohan&apos;s timber or Gondor&apos;s
          stone. The palette is what the{" "}
          <Link href={{ pathname: "/decoration" }} className="underline">
            decoration score
          </Link>{" "}
          grades a build&apos;s theme against.
        </p>
      </header>

      <ul className="space-y-3">
        {topLevel.map((c) => {
          const kids = childrenOf.get(c.id) ?? [];
          const mem = membersById.get(c.id) ?? [];
          return (
            <li
              key={c.id}
              className="rounded border border-stone-200 dark:border-stone-800 p-4"
            >
              <div className="flex items-baseline gap-3 flex-wrap">
                <Link
                  href={{ pathname: `/cultures/${c.id}` }}
                  className="text-base font-semibold hover:underline"
                >
                  {c.displayName}
                </Link>
                <span className="font-mono text-xs text-stone-500">{c.id}</span>
                {mem.length > 0 && (
                  <span className="ml-auto text-xs text-stone-500">
                    {mem.map((m) => m.displayName).join(", ")}
                  </span>
                )}
              </div>
              {c.description && (
                <p className="text-sm opacity-70 mt-2">{c.description}</p>
              )}

              {kids.length > 0 && (
                <ul className="mt-3 space-y-2 border-l border-stone-200 dark:border-stone-800 pl-4">
                  {kids.map((k) => {
                    const kmem = membersById.get(k.id) ?? [];
                    return (
                      <li key={k.id}>
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <Link
                            href={{ pathname: `/cultures/${k.id}` }}
                            className="text-sm font-semibold hover:underline"
                          >
                            {k.displayName}
                          </Link>
                          {kmem.length > 0 && (
                            <span className="ml-auto text-xs text-stone-500">
                              {kmem.map((m) => m.displayName).join(", ")}
                            </span>
                          )}
                        </div>
                        {k.description && (
                          <p className="text-xs opacity-60 mt-1">
                            {k.description}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/buildings" }} className="underline">
          Buildings
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/factions" }} className="underline">
          Factions
        </Link>
      </footer>
    </div>
  );
}
