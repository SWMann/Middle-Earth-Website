import Link from "next/link";
import { getWikiSections, isAdmin } from "@/lib/data/wiki";
import { safeAuth } from "@/lib/auth-helpers";

export const revalidate = 60;

export const metadata = {
  title: "Wiki — Middle-earth",
  description: "Lore and mechanics documentation.",
};

export default async function WikiIndexPage() {
  const [sections, session] = await Promise.all([
    getWikiSections(),
    safeAuth(),
  ]);
  const admin = isAdmin(session?.user?.discordId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Reference
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold">Wiki</h1>
          {admin && (
            <Link
              href={{ pathname: "/wiki/_new" }}
              className="text-sm underline opacity-80 hover:opacity-100"
            >
              + New page
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm opacity-70">
          Player-facing lore and mechanics documentation. Maintained by staff
          for mechanics, by faction members for their faction lore.
        </p>
      </header>

      {sections.length === 0 ? (
        <p className="text-sm opacity-60 italic">
          No wiki pages yet. Run <code>pnpm db:seed</code> to populate the
          starter set.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.category}>
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3">
              {section.category}
            </h2>
            <ul className="space-y-2">
              {section.pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={{ pathname: `/wiki/${p.slug}` }}
                    className="text-base hover:underline"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
