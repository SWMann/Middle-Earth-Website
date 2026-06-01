import Link from "next/link";
import { getAllResources, getResourceTagWeights } from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Resources — Middle-earth",
  description: "Tradable goods produced in settlements and traded between factions.",
};

export default async function ResourcesIndexPage() {
  const resources = await getAllResources();
  const withTags = await Promise.all(
    resources.map(async (r) => ({
      resource: r,
      tags: await getResourceTagWeights(r.id),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Resources</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          The tradable goods of Middle-earth. Each resource satisfies one or
          more <em>tags</em> at a particular <strong>weight</strong> — districts
          declare what tags they need, and higher-weight resources satisfy
          them more strongly (often boosting production).
        </p>
      </header>

      <ul className="space-y-2">
        {withTags.map(({ resource, tags }) => (
          <li
            key={resource.id}
            className="rounded border border-stone-200 dark:border-stone-800 p-4"
          >
            <div className="flex items-baseline gap-3 flex-wrap">
              <Link
                href={{ pathname: `/resources/${encodeURIComponent(resource.id)}` }}
                className="text-base font-semibold hover:underline"
              >
                {resource.displayName}
              </Link>
              <span className="font-mono text-xs text-stone-500">
                {resource.id}
              </span>
              {resource.foodValue > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-700/10 text-emerald-700 dark:text-emerald-400">
                  food {resource.foodValue}
                </span>
              )}
              <div className="ml-auto flex gap-2 text-xs">
                {tags.map((t) => (
                  <span key={t.tagId} className="text-stone-500">
                    {t.tagName}
                    <span className="opacity-50"> w{t.weight}</span>
                  </span>
                ))}
              </div>
            </div>
            {resource.description && (
              <p className="text-sm opacity-70 mt-2">{resource.description}</p>
            )}
          </li>
        ))}
      </ul>

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/districts" }} className="underline">
          Districts
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/units" }} className="underline">
          Units
        </Link>
      </footer>
    </div>
  );
}
