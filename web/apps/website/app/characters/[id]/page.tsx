import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCharacter,
  getAllCharacterIds,
} from "@/lib/data/characters";
import { getFaction } from "@/lib/data/factions";
import { getRecentEvents } from "@/lib/data/events";
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";
import { AuditFeed } from "@/components/audit-feed";

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = await getAllCharacterIds();
  return ids.map((id) => ({ id: String(id) }));
}

type Params = { id: string };

const RP_YEAR_NOW = 3019; // T.A. — placeholder until config drives it

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const c = await getCharacter(Number(id));
  if (!c) return { title: "Character not found" };
  return {
    title: `${c.name} — Middle-earth`,
    description: c.biography.slice(0, 160),
  };
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const c = await getCharacter(numericId);
  if (!c) notFound();

  const [faction, events] = await Promise.all([
    getFaction(c.factionId),
    getRecentEvents({
      visibility: ["public"],
      factionId: c.factionId,
      touching: true,
      limit: 5,
    }),
  ]);

  const age = RP_YEAR_NOW - c.birthYearRp;
  const woundLabel = woundDescriptor(c.woundScore);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      {/* ----- Header ----- */}
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Link href={{ pathname: "/factions" }} className="hover:underline">
            Characters
          </Link>
          {faction && (
            <>
              <span aria-hidden>·</span>
              <FactionTag factionId={faction.id} />
            </>
          )}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{c.name}</h1>
          {c.title && (
            <span className="text-sm text-stone-500">{c.title}</span>
          )}
        </div>
        <p className="text-sm opacity-70">
          {capitalise(c.race)} &middot; {age} years old (born {c.birthYearRp} T.A.)
          {c.status !== "active" && (
            <span className="ml-2 italic">[{c.status}]</span>
          )}
        </p>
      </header>

      {/* ----- Stat line ----- */}
      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Influence" value={c.influence.toString()} />
          <Stat
            label="Wound Score"
            value={c.woundScore.toString()}
            sub={woundLabel}
          />
          <Stat
            label="Current region"
            value={
              c.currentRegionId ? (
                <RegionTag regionId={c.currentRegionId} idOnly />
              ) : (
                "—"
              )
            }
          />
          <Stat label="Heir" value={c.heirCharacterId ? `#${c.heirCharacterId}` : "—"} />
        </dl>
      </section>

      {/* ----- Biography ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Biography</h2>
        {c.biography ? (
          <p className="text-base opacity-90 leading-relaxed max-w-2xl">
            {c.biography}
          </p>
        ) : (
          <p className="text-sm opacity-60 italic">No biography yet.</p>
        )}
      </section>

      {/* ----- Recent events involving this character's faction ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Recent {faction?.displayName ?? "faction"} events
        </h2>
        <p className="text-xs opacity-50 mb-3">
          Per-character events arrive in Phase 5 with character actions.
          For now: the faction&apos;s activity stream, filtered to events
          touching {faction?.displayName ?? "this faction"}.
        </p>
        <AuditFeed events={events} empty="No recent activity." />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs opacity-50">{sub}</dd>}
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Map a numeric Wound Score to a one-word label for at-a-glance reading.
 * The mortality curve is described in mechanics_spec.md §7.2 — these
 * descriptors track that, not raw thresholds.
 */
function woundDescriptor(score: number): string {
  if (score < 10) return "Hale";
  if (score < 25) return "Scarred";
  if (score < 50) return "Battered";
  if (score < 75) return "Broken";
  if (score < 90) return "Walking wounded";
  return "Death's threshold";
}
