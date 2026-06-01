import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDistrictType,
  getAllDistrictTypes,
  getDistrictConsumes,
  getDistrictProduces,
  getResourcesForTag,
} from "@/lib/data/catalogue";

export const revalidate = 600;

export async function generateStaticParams() {
  const all = await getAllDistrictTypes();
  return all.map((d) => ({ id: d.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const d = await getDistrictType(id);
  if (!d) return { title: "District not found" };
  return {
    title: `${d.displayName} — Middle-earth`,
    description: d.description,
  };
}

export default async function DistrictDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const district = await getDistrictType(id);
  if (!district) notFound();

  const [consumes, produces] = await Promise.all([
    getDistrictConsumes(district.id),
    getDistrictProduces(district.id),
  ]);

  // For each consumed tag, look up which resources satisfy it — gives players
  // the "what can I feed this with" answer in one place.
  const consumesWithResources = await Promise.all(
    consumes.map(async (c) => ({
      ...c,
      candidates: (await getResourcesForTag(c.tagId)).filter(
        (r) => r.weight >= c.weightMin,
      ),
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          <Link href={{ pathname: "/districts" }} className="hover:underline">
            Districts
          </Link>{" "}
          · {district.category}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{district.displayName}</h1>
          <span className="font-mono text-sm text-stone-500">
            {district.id}
          </span>
        </div>
        {district.description && (
          <p className="text-sm opacity-80 max-w-2xl">{district.description}</p>
        )}
      </header>

      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Min tier" value={district.tierMin} />
          <Stat label="Pop cost" value={district.popCost.toString()} />
          <Stat label="Food cost" value={district.foodCost.toString()} />
          <Stat
            label="Pop cap +"
            value={district.populationCapProvided.toString()}
          />
        </dl>
      </section>

      {consumesWithResources.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Consumes daily</h2>
          <ul className="space-y-4">
            {consumesWithResources.map((c) => (
              <li
                key={c.tagId}
                className="rounded border border-stone-200 dark:border-stone-800 p-4"
              >
                <div className="flex items-baseline gap-3 flex-wrap mb-2">
                  <span className="font-medium">
                    {c.dailyAmount}× {c.tagName}
                  </span>
                  <span className="font-mono text-xs text-stone-500">
                    {c.tagId}
                  </span>
                  <span className="text-xs text-stone-500">
                    requires weight ≥ {c.weightMin}
                  </span>
                </div>
                {c.candidates.length === 0 ? (
                  <p className="text-xs opacity-60 italic">
                    No resource currently satisfies this requirement.
                  </p>
                ) : (
                  <div className="text-xs flex flex-wrap gap-x-3 gap-y-1 opacity-80">
                    {c.candidates.map((r) => (
                      <Link
                        key={r.resourceId}
                        href={{ pathname: `/resources/${encodeURIComponent(r.resourceId)}` }}
                        className="hover:underline"
                      >
                        {r.resourceName}{" "}
                        <span className="opacity-60">w{r.weight}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {produces.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Produces daily</h2>
          <ul className="space-y-1.5 text-sm">
            {produces.map((p) => (
              <li key={p.resourceId} className="flex items-baseline gap-3">
                <Link
                  href={{ pathname: `/resources/${encodeURIComponent(p.resourceId)}` }}
                  className="font-medium hover:underline"
                >
                  {p.resourceName}
                </Link>
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  {p.dailyAmount}/day
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {consumes.length === 0 && produces.length === 0 && (
        <section>
          <p className="text-sm opacity-60 italic">
            This district doesn&apos;t participate in the supply chain. Its
            role is structural (e.g. population housing) or enabling
            (e.g. Barracks unlocks unit recruitment).
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
