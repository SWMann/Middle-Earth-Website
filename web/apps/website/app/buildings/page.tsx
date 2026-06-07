import Link from "next/link";
import {
  getAllBuildingTypes,
  getAllFunctionalComponents,
  getAllBuildingComponentLinks,
  getBuildingDistrictUsage,
  getAllBuildingTags,
  getAllBuildingVariantLinks,
  getAllBuildingOutputs,
} from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Buildings — Middle-earth",
  description:
    "The structures players physically build. Districts are assembled from buildings, which in turn supply functional components.",
};

const CATEGORY_ORDER = [
  "residential",
  "structural",
  "functional",
  "landmark",
];

const HOUSING_CLASS_ORDER = [
  "peasant",
  "artisan",
  "merchant",
  "scholar",
  "noble",
];

const CATEGORY_BLURB: Record<string, string> = {
  residential:
    "Housing. Each provides beds in quantity (the quarter's population cap is the sum of the beds inside) and carries a class. A quarter accepts housing of its own class or any lower-standing one — peasant < artisan < merchant < scholar < noble — so a manor can't drop into a peasant quarter, but a noble estate may include servant cottages.",
  structural:
    "The anchor of a district — there is usually exactly one, and it defines the district's identity.",
  functional:
    "Working buildings that supply the components a district needs to operate.",
  landmark:
    "Optional prestige structures. They rarely supply components but lift a plot's decoration score and standing.",
};

function footprint(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} blk²`;
  if (min != null) return `≥ ${min} blk²`;
  if (max != null) return `≤ ${max} blk²`;
  return null;
}

export default async function BuildingsIndexPage() {
  const [buildings, components, links, usage, tags, variants, outputs] =
    await Promise.all([
      getAllBuildingTypes(),
      getAllFunctionalComponents(),
      getAllBuildingComponentLinks(),
      getBuildingDistrictUsage(),
      getAllBuildingTags(),
      getAllBuildingVariantLinks(),
      getAllBuildingOutputs(),
    ]);

  const outputsByBuilding = new Map<
    string,
    { name: string; amount: number; kind: string }[]
  >();
  for (const o of outputs) {
    if (!outputsByBuilding.has(o.buildingTypeId))
      outputsByBuilding.set(o.buildingTypeId, []);
    outputsByBuilding.get(o.buildingTypeId)!.push({
      name: o.resourceName ?? "coin",
      amount: o.dailyAmount,
      kind: o.outputKind,
    });
  }

  const providesByBuilding = new Map<
    string,
    { name: string; quantity: number }[]
  >();
  for (const l of links) {
    if (!providesByBuilding.has(l.buildingTypeId))
      providesByBuilding.set(l.buildingTypeId, []);
    providesByBuilding
      .get(l.buildingTypeId)!
      .push({ name: l.componentName, quantity: l.quantity });
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

  const tagsByBuilding = new Map<string, string[]>();
  for (const t of tags) {
    if (!tagsByBuilding.has(t.buildingTypeId))
      tagsByBuilding.set(t.buildingTypeId, []);
    tagsByBuilding.get(t.buildingTypeId)!.push(t.tag);
  }

  const variantsByBuilding = new Map<string, string[]>();
  for (const v of variants) {
    if (!variantsByBuilding.has(v.buildingTypeId))
      variantsByBuilding.set(v.buildingTypeId, []);
    variantsByBuilding.get(v.buildingTypeId)!.push(v.variantName);
  }

  const nameById = new Map(buildings.map((b) => [b.id, b.displayName]));

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
          forge, an altar) in some quantity, and a district is complete once its
          buildings collectively provide everything it requires. Every culture
          dresses the same building in its own style — see{" "}
          <Link href={{ pathname: "/cultures" }} className="underline">
            Cultures
          </Link>
          .
        </p>
      </header>

      {orderedCategories.map((category) => {
        const list = [...(byCategory.get(category) ?? [])];
        // Housing reads best grouped by class (peasant → noble).
        if (category === "residential") {
          list.sort((a, b) => {
            const ai = HOUSING_CLASS_ORDER.indexOf(a.housingClass ?? "");
            const bi = HOUSING_CLASS_ORDER.indexOf(b.housingClass ?? "");
            if (ai !== bi) return ai - bi;
            return a.displayName.localeCompare(b.displayName);
          });
        }
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
                const bTags = tagsByBuilding.get(b.id) ?? [];
                const bVariants = variantsByBuilding.get(b.id) ?? [];
                const bOutputs = outputsByBuilding.get(b.id) ?? [];
                const fp = footprint(b.minFootprintBlocks, b.maxFootprintBlocks);
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
                      {b.housingClass && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          {b.housingClass} class
                        </span>
                      )}
                      {b.level > 1 && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                          tier {b.level}
                          {b.upgradesFrom && nameById.get(b.upgradesFrom)
                            ? ` · upgrades ${nameById.get(b.upgradesFrom)}`
                            : ""}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-stone-500 tabular-nums">
                        {b.tierMin && <>tier {b.tierMin}+ </>}
                        {fp && <>· {fp}</>}
                        {b.minHeightBlocks != null && (
                          <> · ≥{b.minHeightBlocks} high</>
                        )}
                      </span>
                    </div>
                    {b.description && (
                      <p className="text-sm opacity-70 mt-1.5">
                        {b.description}
                      </p>
                    )}

                    {bOutputs.length > 0 && (
                      <div className="mt-2.5">
                        <span className="text-[10px] uppercase tracking-widest opacity-50 mr-2">
                          Produces / day
                        </span>
                        <span className="inline-flex flex-wrap gap-1.5 align-middle">
                          {bOutputs.map((o) => (
                            <span
                              key={o.name + o.kind}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300"
                            >
                              +{o.amount} {o.name}
                              {o.kind !== "primary" ? ` (${o.kind})` : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {provides.length > 0 && (
                      <div className="mt-2.5">
                        <span className="text-[10px] uppercase tracking-widest opacity-50 mr-2">
                          Provides
                        </span>
                        <span className="inline-flex flex-wrap gap-1.5 align-middle">
                          {provides.map((c) => (
                            <span
                              key={c.name}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            >
                              {c.quantity > 1 ? `${c.quantity}× ` : ""}
                              {c.name}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {bTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                        {bTags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500 font-mono"
                          >
                            {t}
                          </span>
                        ))}
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

                    {bVariants.length > 0 && (
                      <div className="mt-2 text-xs opacity-70">
                        <span className="opacity-60">
                          Cultural variants:{" "}
                        </span>
                        {bVariants.join(", ")}
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
        <Link href={{ pathname: "/cultures" }} className="underline">
          Cultures
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/decoration" }} className="underline">
          Decoration scoring
        </Link>
      </footer>
    </div>
  );
}
