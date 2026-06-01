import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getResource,
  getAllResources,
  getResourceTagWeights,
  getDistrictTypesProducing,
  getUnitTypesRequiring,
} from "@/lib/data/catalogue";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";

export const revalidate = 600;

export async function generateStaticParams() {
  const all = await getAllResources();
  return all.map((r) => ({ id: r.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const r = await getResource(decodeURIComponent(id));
  if (!r) return { title: "Resource not found" };
  return {
    title: `${r.displayName} — Middle-earth`,
    description: r.description || `${r.displayName} (${r.id}) resource details.`,
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const resource = await getResource(decoded);
  if (!resource) notFound();

  const [tags, producedBy, usedByUnits] = await Promise.all([
    getResourceTagWeights(resource.id),
    getDistrictTypesProducing(resource.id),
    getUnitTypesRequiring(resource.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          <Link href={{ pathname: "/resources" }} className="hover:underline">
            Resources
          </Link>
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{resource.displayName}</h1>
          <span className="font-mono text-sm text-stone-500">
            {resource.id}
          </span>
          {resource.foodValue > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-700/10 text-emerald-700 dark:text-emerald-400">
              food value {resource.foodValue}
            </span>
          )}
        </div>
        {resource.description && (
          <p className="text-sm opacity-80 max-w-2xl">{resource.description}</p>
        )}
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Satisfies tags</h2>
        {tags.length === 0 ? (
          <p className="text-sm opacity-60 italic">
            This resource doesn&apos;t map to any tags — it&apos;s a terminal
            output not consumed by other districts.
          </p>
        ) : (
          <ul className="text-sm space-y-1.5">
            {tags.map((t) => (
              <li key={t.tagId} className="flex items-baseline gap-3">
                <Link
                  href={{ pathname: `/resources?tag=${encodeURIComponent(t.tagId)}` }}
                  className="font-mono text-xs hover:underline"
                  title={t.tagId}
                >
                  {t.tagId}
                </Link>
                <span>{t.tagName}</span>
                <span className="text-xs text-stone-500">weight {t.weight}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs opacity-50 mt-2">
          Districts that consume one of these tags can be satisfied by this
          resource. Higher weight typically yields a production bonus.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Produced by</h2>
        {producedBy.length === 0 ? (
          <p className="text-sm opacity-60 italic">
            No district type produces this resource in the catalogue yet. May
            be added in a later content drop.
          </p>
        ) : (
          <ul className="text-sm space-y-1.5">
            {producedBy.map((d) => (
              <li key={d.districtId} className="flex items-baseline gap-3">
                <Link
                  href={{ pathname: `/districts/${d.districtId}` }}
                  className="font-medium hover:underline"
                >
                  {d.districtName}
                </Link>
                <span className="text-xs text-stone-500">
                  {d.category}
                </span>
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  {d.dailyAmount}/day
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {usedByUnits.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Required to recruit</h2>
          <ul className="text-sm space-y-1.5">
            {usedByUnits.map(async (u) => {
              const f = u.factionId ? await getFaction(u.factionId) : null;
              return (
                <li
                  key={u.unitId}
                  className="flex items-baseline gap-3 flex-wrap"
                >
                  <Link
                    href={{ pathname: `/units/${u.unitId}` }}
                    className="font-medium hover:underline"
                  >
                    {u.unitName}
                  </Link>
                  {f && <FactionTag factionId={f.id} />}
                  <span className="ml-auto text-xs tabular-nums opacity-70">
                    {u.amount} per recruit
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
