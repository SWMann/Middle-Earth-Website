import Link from "next/link";
import {
  getAllBuildingTypes,
  getAllFunctionalComponents,
  getAllBuildingComponentLinks,
  getBuildingDistrictUsage,
} from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Buildings — Middle-earth",
  description:
    "The structures players physically build. Districts are assembled from buildings, which in turn supply functional components.",
};

const CATEGORY_ORDER = ["structural", "functional", "landmark"];

const CATEGORY_BLURB: Record<string, string> = {
  structural:
    "The anchor of a district — there is usually exactly one, and it defines the district's identity.",
  functional:
    "Working buildings that supply the components a district needs to operate.",
  landmark:
    "Optional prestige structures. They rarely supply components but lift a plot's decoration score and standing.",
};

export default async function BuildingsIndexPage() {
  const [buildings, components, links, usage] = await Promise.all([
    getAllBuildingTypes(),
    getAllFunctionalComponents(),
    getAllBuildingComponentLinks(),
    getBuildingDistrictUsage(),
  ]);

  const providesByBuilding = new Map<string, string[]>();
  for (const l of links) {
    if (!providesByBuilding.has(l.buildingTypeId))
      providesByBuilding.set(l.buildingTypeId, []);
    providesByBuilding.get(l.buildingTypeId)!.push(l.componentName);
  }

  const usageByBuilding = new Map<
    string,
    { districtTypeId: string; districtName: string }[]
  >();
  for (const u of usage) {
    if (!u.buildingTypeId) continue;
    if (!usageByBuilding.has(u.buildingTypeId))
      usageByBuilding.set(u.buildingTypeId, []);
    usageByBuilding.get(u.buildingTypeId)!.push({
      districtTypeId: u.districtTypeId,
      districtName: u.districtName,
    });
  }

  const byCategory = new Map<string, typeof buildings>();
  for (const b of buildings) {
    if (!byCategory.has(b.category)) byCategory.set(b.category, []);
    byCategory.get(b.category)!.push(b);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-12">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Buildings</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          A district is not a single block — it is assembled from buildings. Each
          building supplies one or more{" "}
          <span className="font-medium">functional components</span> (a bed, a
          forge, an altar), and a district is only complete once the buildings on
          its plot collectively provide everything it requires. Players are free
          to lay out, style, and scale each building however they like, so long
          as the components are present.
        </p>
      </header>

      {orderedCategories.map((category) => {
        const list = byCategory.get(category) ?? [];
        return (
          <section key={category}>
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-1">
              {category}
            </h2>
            {CATEGORY_BLURB[category] && (
              <p className="text-xs opacity-50 mb-3 max-w-2xl">
                {CATEGORY_BLURB[category]}
              </p>
            )}
            <ul className="space-y-2">
              {list.map((b) => {
                const provides = providesByBuilding.get(b.id) ?? [];
                const usedBy = usageByBuilding.get(b.id) ?? [];
                return (
                  <li
                    key={b.id}
                    id={b.id}
                    className="rounded border border-stone-200 dark:border-stone-800 p-4 scroll-mt-20"
                  >
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-base font-semibold">
                        {b.displayName}
                      </span>
                      <span className="font-mono text-xs text-stone-500">
                        {b.id}
                      </span>
                    </div>
                    {b.description && (
                      <p className="text-sm opacity-70 mt-1.5">
                        {b.description}
                      </p>
                    )}

                    {provides.length > 0 && (
                      <div className="mt-2.5">
                        <span className="text-[10px] uppercase tracking-widest opacity-50 mr-2">
                          Provides
                        </span>
                        <span className="inline-flex flex-wrap gap-1.5 align-middle">
                          {provides.map((c) => (
                            <span
                              key={c}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            >
                              {c}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {usedBy.length > 0 && (
                      <div className="mt-2 text-xs opacity-70">
                        <span className="opacity-60">Required by: </span>
                        {usedBy.map((u, i) => (
                          <span key={u.districtTypeId}>
                            {i > 0 && ", "}
                            <Link
                              href={{
                                pathname: `/districts/${u.districtTypeId}`,
                              }}
                              className="hover:underline"
                            >
                              {u.districtName}
                            </Link>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* ----- Component reference ----- */}
      <section>
        <h2 className="text-sm uppercase tracking-widest opacity-60 mb-1">
          Functional components
        </h2>
        <p className="text-xs opacity-50 mb-3 max-w-2xl">
          The atomic capabilities a district checks for. A district&apos;s
          requirement is satisfied no matter which building supplies the
          component, so multiple layouts can meet the same spec.
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {components.map((c) => (
            <li key={c.id} className="flex items-baseline gap-2">
              <span className="font-medium">{c.displayName}</span>
              <span className="font-mono text-[10px] text-stone-500">
                {c.id}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/districts" }} className="underline">
          Districts
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/decoration" }} className="underline">
          Decoration scoring
        </Link>
      </footer>
    </div>
  );
}
