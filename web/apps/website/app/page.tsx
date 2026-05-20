import Link from "next/link";
import { safeAuth } from "@/lib/auth-helpers";
import { getMajorFactions } from "@/lib/data/factions";
import { countSettlements } from "@/lib/data/settlements";
import { getRecentEvents } from "@/lib/data/events";
import { FactionTag } from "@/components/tags/faction-tag";
import { AuditFeed } from "@/components/audit-feed";

// Refresh the server-rendered status numbers every 60s. The audit feed
// updates at the same cadence; that matches the daily-tick frequency
// guidance in web_spec.md §1.5 and the polling-light approach of Phase 2.
export const revalidate = 60;

export default async function HomePage() {
  const [session, factions, settlementCount, events] = await Promise.all([
    safeAuth(),
    getMajorFactions(),
    countSettlements(),
    getRecentEvents({ visibility: ["public"], limit: 6 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-16">
      {/* ----- Hero ----- */}
      <section>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Late Third Age &middot; In playtest
        </p>
        <h1 className="mb-6 text-4xl font-semibold leading-tight">
          Canon is a starting point, not a cage.
        </h1>
        <p className="mb-4 opacity-80 max-w-2xl">
          A modded Minecraft server set in late Third Age Middle-earth. Players
          belong to factions &mdash; major canon ones and player-founded minor
          ones &mdash; and build, trade, fight, and tell stories together.
        </p>
        <p className="mb-8 opacity-80 max-w-2xl">
          The systems are deep, interlocking, and rewarding to master &mdash;
          but they do not require a wiki binder and three staff approvals to
          engage with. The mod does the bookkeeping; the website shows the
          state; the player makes the decisions.
        </p>
        <div className="flex gap-4 text-sm">
          {session?.user ? (
            <Link
              href={{ pathname: "/dashboard" }}
              className="rounded border border-current px-4 py-2 hover:opacity-80"
            >
              Open your dashboard
            </Link>
          ) : (
            <Link
              href={{ pathname: "/api/auth/signin" }}
              className="rounded border border-current px-4 py-2 hover:opacity-80"
            >
              Apply to join
            </Link>
          )}
          <Link
            href={{ pathname: "/wiki" }}
            className="rounded border border-current px-4 py-2 hover:opacity-80"
          >
            Read the wiki
          </Link>
        </div>
      </section>

      {/* ----- Status line ----- */}
      <section className="border-t border-stone-200 dark:border-stone-800 pt-8">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Major factions" value={factions.length.toString()} />
          <Stat label="Settlements" value={settlementCount.toString()} />
          <Stat label="Active wars" value={String(eventsOfType(events, "WAR_DECLARED"))} />
          <Stat label="RP year" value="3019 T.A." />
        </dl>
      </section>

      {/* ----- Two-column: factions + recent events ----- */}
      <section className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-lg font-semibold mb-4">Factions in play</h2>
          <ul className="space-y-2 text-sm">
            {factions.map((f) => (
              <li key={f.id} className="flex items-baseline gap-2">
                <FactionTag factionId={f.id} />
                <span className="text-xs text-stone-500">
                  {alignmentLabel(f.alignment)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={{ pathname: "/factions" }}
            className="inline-block mt-4 text-sm underline opacity-80 hover:opacity-100"
          >
            See all factions &rarr;
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Recent events</h2>
          <AuditFeed
            events={events}
            empty="The world is quiet. New events will appear here as factions act."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function alignmentLabel(a: string): string {
  if (a === "good") return "Free Peoples";
  if (a === "evil") return "Servants of Shadow";
  return "Unaligned";
}

function eventsOfType(events: { eventType: string }[], type: string): number {
  return events.filter((e) => e.eventType === type).length;
}
