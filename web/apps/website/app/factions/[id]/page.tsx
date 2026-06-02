import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getFaction,
  getAllFactions,
  getSubfactions,
  getRegionsClaimedBy,
  getSettlementsByFaction,
} from "@/lib/data/factions";
import { getRecentEvents } from "@/lib/data/events";
import { getCultureForFaction } from "@/lib/data/catalogue";
import {
  getDiplomaticStatesFor,
  otherFaction,
  diplomaticStateLabel,
  diplomaticStateTone,
} from "@/lib/data/diplomacy";
import {
  getCharactersByFaction,
  getActiveCharacterForPlayer,
} from "@/lib/data/characters";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";
import { SettlementTag } from "@/components/tags/settlement-tag";
import { CharacterTag } from "@/components/tags/character-tag";
import { AuditFeed } from "@/components/audit-feed";

export const revalidate = 60;

export async function generateStaticParams() {
  // Pre-render the 14 known factions; runtime params (player-founded
  // minor factions) fall through to on-demand rendering.
  const all = await getAllFactions();
  return all.map((f) => ({ id: f.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const f = await getFaction(id);
  if (!f) return { title: "Faction not found" };
  return {
    title: `${f.displayName} — Middle-earth`,
    description: f.loreSummary || `Overview of ${f.displayName}.`,
  };
}

export default async function FactionDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const f = await getFaction(id);
  if (!f) notFound();

  const [parent, subs, regions, settlements, characters, events, diplomaticStates, culture] = await Promise.all([
    f.parentFactionId ? getFaction(f.parentFactionId) : Promise.resolve(null),
    getSubfactions(f.id),
    getRegionsClaimedBy(f.id),
    getSettlementsByFaction(f.id),
    getCharactersByFaction(f.id),
    getRecentEvents({ visibility: ["public"], factionId: f.id, touching: true, limit: 10 }),
    getDiplomaticStatesFor(f.id),
    getCultureForFaction(f.id),
  ]);

  // Faction leader = highest-influence active character. Reasonable
  // approximation until a leader_uuid is explicitly set on factions.
  const leader = [...characters].sort((a, b) => b.influence - a.influence)[0] ?? null;

  // Show the dashboard link only to members (and admins). The dashboard
  // itself re-checks permission, but advertising it to non-members would
  // be UX noise.
  const session = await safeAuth();
  const viewerCharacter = session?.user
    ? await getActiveCharacterForPlayer(session.user.discordId)
    : null;
  const canSeeDashboard =
    viewerCharacter?.factionId === f.id ||
    (session?.user && isAdmin(session.user.discordId));

  // Subfaction holdings — fetched per-sub so we can show them grouped on the
  // parent's page (the player expectation is "Gondor's stuff includes Dol
  // Amroth's stuff" even though they're separate factions in the model).
  const subHoldings = await Promise.all(
    subs.map(async (sub) => ({
      faction: sub,
      settlements: await getSettlementsByFaction(sub.id),
      regions: await getRegionsClaimedBy(sub.id),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-12">
      {/* ----- Header ----- */}
      <header>
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <p className="text-xs uppercase tracking-widest opacity-60">
            <Link href={{ pathname: "/factions" }} className="hover:underline">
              Factions
            </Link>
            {parent && (
              <>
                {" · within "}
                <Link
                  href={{ pathname: `/factions/${parent.id}` }}
                  className="hover:underline"
                >
                  {parent.displayName}
                </Link>
              </>
            )}
          </p>
          {canSeeDashboard && (
            <Link
              href={{ pathname: `/factions/${f.id}/dashboard` }}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Internal dashboard &rarr;
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 mb-4">
          {f.bannerHex && (
            <span
              aria-hidden
              className="inline-block h-6 w-6 rounded border border-stone-300 dark:border-stone-700"
              style={{ backgroundColor: f.bannerHex }}
            />
          )}
          <h1 className="text-3xl font-semibold">{f.displayName}</h1>
          <span className="text-sm text-stone-500">
            {alignmentLabel(f.alignment)}
          </span>
          {culture && (
            <Link
              href={{ pathname: `/cultures/${culture.cultureId}` }}
              className="text-xs px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900"
              title={`Builds in the ${culture.cultureName} architectural style`}
            >
              {culture.cultureName} style
            </Link>
          )}
        </div>
        {f.loreSummary && (
          <p className="text-base opacity-80 leading-relaxed max-w-2xl">
            {f.loreSummary}
          </p>
        )}
      </header>

      {/* ----- Diplomatic banner ----- */}
      {diplomaticStates.length > 0 && (
        <section className="space-y-2">
          {diplomaticStates.map((d) => {
            const tone = diplomaticStateTone(d.stateType);
            const other = otherFaction(d, f.id);
            const cls =
              tone === "hostile"
                ? "border-red-700/40 bg-red-700/5 text-red-700 dark:text-red-400"
                : tone === "friendly"
                ? "border-emerald-700/40 bg-emerald-700/5 text-emerald-700 dark:text-emerald-400"
                : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900";
            return (
              <div
                key={d.id}
                className={`rounded border ${cls} p-3 text-sm flex flex-wrap items-baseline gap-3`}
              >
                <span className="font-medium">
                  {diplomaticStateLabel(d.stateType)}
                </span>
                <FactionTag factionId={other} />
                {d.reason && (
                  <span className="opacity-70 text-xs">
                    — {d.reason}
                  </span>
                )}
                <span className="ml-auto text-xs opacity-60">
                  since{" "}
                  {d.startedAt.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {/* ----- Stat line ----- */}
      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Regions claimed" value={regions.length.toString()} />
          <Stat label="Settlements" value={settlements.length.toString()} />
          <Stat label="Subfactions" value={subs.length.toString()} />
          <Stat
            label="Faction leader"
            value={leader ? <CharacterTag characterId={leader.id} /> : "—"}
          />
        </dl>
      </section>

      {/* ----- Two columns ----- */}
      <section className="grid md:grid-cols-2 gap-10">
        {/* Settlements */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Settlements</h2>
          {settlements.length === 0 ? (
            <p className="text-sm opacity-60 italic">
              No settlements yet. Found one with a Settler Caravan.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {settlements.map((s) => (
                <li key={s.id}>
                  <SettlementTag settlementId={s.id} withTier />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Regions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Claimed regions</h2>
          {regions.length === 0 ? (
            <p className="text-sm opacity-60 italic">No regions claimed.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {regions.map((r) => (
                <li key={r.id}>
                  <RegionTag regionId={r.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ----- Subfactions and their holdings ----- */}
      {subHoldings.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Subfaction holdings</h2>
          {subHoldings.map(({ faction: sub, settlements: ss, regions: rs }) => (
            <div
              key={sub.id}
              className="rounded-lg border border-stone-200 dark:border-stone-800 p-5"
            >
              <div className="flex items-baseline gap-2 mb-2">
                <FactionTag factionId={sub.id} />
                <span className="text-xs text-stone-500">
                  · {ss.length} settlement{ss.length === 1 ? "" : "s"} · {rs.length} region{rs.length === 1 ? "" : "s"}
                </span>
              </div>
              {sub.loreSummary && (
                <p className="text-sm opacity-80 mb-3">{sub.loreSummary}</p>
              )}
              {ss.length > 0 && (
                <ul className="text-sm space-y-1">
                  {ss.map((s) => (
                    <li key={s.id}>
                      <SettlementTag settlementId={s.id} withTier />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ----- Members ----- */}
      {characters.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Notable members</h2>
          <ul className="space-y-2 text-sm">
            {[...characters]
              .sort((a, b) => b.influence - a.influence)
              .map((c) => (
                <li
                  key={c.id}
                  className="flex items-baseline gap-3 flex-wrap"
                >
                  <CharacterTag characterId={c.id} />
                  <span className="text-xs text-stone-500 tabular-nums">
                    Inf {c.influence}
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    Wnd {c.woundScore}
                  </span>
                  {c.currentRegionId && (
                    <span className="text-xs text-stone-500">
                      <RegionTag regionId={c.currentRegionId} idOnly />
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* ----- Recent events ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent events</h2>
        <AuditFeed
          events={events}
          empty={`${f.displayName} has been quiet of late.`}
        />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function alignmentLabel(a: string): string {
  if (a === "good") return "Free Peoples";
  if (a === "evil") return "Servants of Shadow";
  return "Unaligned";
}
