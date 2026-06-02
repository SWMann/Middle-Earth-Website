import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCulture,
  getAllCultures,
  getCulturePalettes,
  getCultureVariants,
  getFactionsForCulture,
} from "@/lib/data/catalogue";

export const revalidate = 600;

export async function generateStaticParams() {
  const all = await getAllCultures();
  return all.map((c) => ({ id: c.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const c = await getCulture(id);
  if (!c) return { title: "Culture not found" };
  return { title: `${c.displayName} — Middle-earth`, description: c.description };
}

const ROLE_ORDER = ["foundation", "wall", "floor", "roof", "accent"];

function prettyRole(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Strip the 'minecraft:' namespace and prettify a block id for display. */
function prettyBlock(id: string): string {
  return id
    .replace(/^minecraft:/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function CultureDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const culture = await getCulture(id);
  if (!culture) notFound();

  const [palettes, variants, factions, parent] = await Promise.all([
    getCulturePalettes(culture.id),
    getCultureVariants(culture.id),
    getFactionsForCulture(culture.id),
    culture.parentCultureId
      ? getCulture(culture.parentCultureId)
      : Promise.resolve(null),
  ]);

  const orderedPalettes = [...palettes].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Link href={{ pathname: "/cultures" }} className="hover:underline">
            Cultures
          </Link>
          {parent && (
            <>
              <span aria-hidden>·</span>
              <Link
                href={{ pathname: `/cultures/${parent.id}` }}
                className="hover:underline"
              >
                {parent.displayName}
              </Link>
            </>
          )}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{culture.displayName}</h1>
          <span className="font-mono text-sm text-stone-500">{culture.id}</span>
        </div>
        {culture.description && (
          <p className="text-sm opacity-80 max-w-2xl">{culture.description}</p>
        )}
      </header>

      {/* ----- Member factions ----- */}
      {factions.length > 0 && (
        <section className="border-y border-stone-200 dark:border-stone-800 py-6">
          <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">
            Builds for
          </h2>
          <ul className="flex flex-wrap gap-2">
            {factions.map((f) => (
              <li key={f.id}>
                <Link
                  href={{ pathname: `/factions/${f.id}` }}
                  className="inline-flex items-center gap-2 rounded border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-900"
                >
                  {f.bannerHex && (
                    <span
                      aria-hidden
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: f.bannerHex }}
                    />
                  )}
                  {f.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Approved palette ----- */}
      {orderedPalettes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-1">Approved palette</h2>
          <p className="text-xs opacity-60 mb-4 max-w-2xl">
            The block sets a build should draw from to read as{" "}
            {culture.displayName}. The{" "}
            <Link href={{ pathname: "/decoration" }} className="underline">
              theme-adherence
            </Link>{" "}
            decoration criterion scores a plot on how closely its blocks match
            these.
          </p>
          <div className="space-y-4">
            {orderedPalettes.map((p) => (
              <div key={p.id}>
                <div className="flex items-baseline gap-3 mb-1.5">
                  <span className="text-xs uppercase tracking-widest opacity-60 w-24">
                    {prettyRole(p.role)}
                  </span>
                  {p.note && (
                    <span className="text-xs opacity-60">{p.note}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:pl-28">
                  {(p.blocks ?? []).map((b) => (
                    <span
                      key={b}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300"
                      title={b}
                    >
                      {prettyBlock(b)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ----- Building variants ----- */}
      {variants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-1">Building variants</h2>
          <p className="text-xs opacity-60 mb-4 max-w-2xl">
            How {culture.displayName} dresses the shared buildings. Same
            components, same district role — a different face.
          </p>
          <ul className="space-y-2">
            {variants.map((v) => (
              <li
                key={v.buildingTypeId}
                className="rounded border border-stone-200 dark:border-stone-800 p-3"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold">{v.variantName}</span>
                  <Link
                    href={{ pathname: `/buildings`, hash: v.buildingTypeId }}
                    className="text-xs text-stone-500 hover:underline"
                  >
                    {v.buildingName}
                  </Link>
                </div>
                {v.description && (
                  <p className="text-sm opacity-70 mt-1">{v.description}</p>
                )}
                {v.paletteNote && (
                  <p className="text-xs opacity-50 mt-1 italic">
                    {v.paletteNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/buildings" }} className="underline">
          Buildings
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/decoration" }} className="underline">
          Decoration scoring
        </Link>
      </footer>
    </div>
  );
}
