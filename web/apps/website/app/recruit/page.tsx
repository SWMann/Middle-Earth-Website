import Link from "next/link";
import { getMajorFactions, getSettlementsByFaction } from "@/lib/data/factions";

export const revalidate = 300;

export const metadata = {
  title: "Recruit — Middle-earth",
  description: "Help bring new players into your faction.",
};

export default async function RecruitPage() {
  const majors = await getMajorFactions();

  // Light enrichment so each card shows whether the faction has settlements
  // to receive new players. Subfactions skipped here; subfaction-specific
  // recruitment is at the faction-detail level.
  const enriched = await Promise.all(
    majors.map(async (f) => ({
      faction: f,
      settlementCount: (await getSettlementsByFaction(f.id)).length,
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Bring more friends in
        </p>
        <h1 className="text-3xl font-semibold">Help recruit</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          The server runs on its players. Every faction wants more builders,
          soldiers, traders, and characters. If you&apos;ve found something
          worth telling people about, here&apos;s the path.
        </p>
      </header>

      <section className="space-y-3 text-sm">
        <h2 className="text-lg font-semibold">How to invite someone</h2>
        <ol className="list-decimal pl-6 space-y-2 opacity-90 leading-relaxed">
          <li>
            Send them the server&apos;s landing page:{" "}
            <code className="font-mono">/</code> &mdash; one-page summary, takes
            30 seconds to read.
          </li>
          <li>
            Point them at <Link href={{ pathname: "/factions" }} className="underline">/factions</Link>
            {" "}
            so they can pick somewhere to belong.
          </li>
          <li>
            Walk them through{" "}
            <Link
              href={{ pathname: "/wiki/getting-started" }}
              className="underline"
            >
              the getting-started page
            </Link>{" "}
            &mdash; sign in, link Minecraft, hop into Discord.
          </li>
          <li>
            Be in your faction&apos;s Discord channel to welcome them and
            assign a first task within their first hour. <em>This is the
            single most important part.</em>
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Factions currently recruiting</h2>
        <p className="text-xs opacity-60">
          All factions are open to new players. Click any to see what they hold
          and who to contact.
        </p>
        <ul className="grid sm:grid-cols-2 gap-3">
          {enriched.map(({ faction: f, settlementCount }) => (
            <li key={f.id}>
              <Link
                href={{ pathname: `/factions/${f.id}` }}
                className="block rounded border border-stone-200 dark:border-stone-800 p-4 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  {f.bannerHex && (
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: f.bannerHex }}
                    />
                  )}
                  <span className="font-semibold">{f.displayName}</span>
                  <span className="ml-auto text-xs opacity-60">
                    {settlementCount} settlement{settlementCount === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
