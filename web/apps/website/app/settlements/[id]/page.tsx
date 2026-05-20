import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSettlement,
  getAllSettlementIds,
  getSiblingSettlements,
} from "@/lib/data/settlements";
import { getFaction } from "@/lib/data/factions";
import { getRegion } from "@/lib/data/regions";
import { getRecentEvents } from "@/lib/data/events";
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";
import { SettlementTag } from "@/components/tags/settlement-tag";
import { AuditFeed } from "@/components/audit-feed";

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = await getAllSettlementIds();
  return ids.map((id) => ({ id: String(id) }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const s = await getSettlement(Number(id));
  if (!s) return { title: "Settlement not found" };
  return {
    title: `${s.name} — Middle-earth`,
    description: `${TIER_LABELS[s.tier] ?? s.tier} of ${s.factionId}.`,
  };
}

const TIER_LABELS: Record<string, string> = {
  hamlet: "Hamlet",
  steading: "Steading",
  village: "Village",
  burgh: "Burgh",
  town: "Town",
  city: "City",
  great_city: "Great City",
  capital: "Capital",
};

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const s = await getSettlement(numericId);
  if (!s) notFound();

  const [faction, region, siblings, events] = await Promise.all([
    getFaction(s.factionId),
    getRegion(s.regionId),
    getSiblingSettlements(s.factionId, s.id),
    getRecentEvents({ visibility: ["public"], factionId: s.factionId, touching: true, limit: 6 }),
  ]);

  const populationPct =
    s.populationCap > 0
      ? Math.min(100, Math.round((s.population / s.populationCap) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      {/* ----- Header ----- */}
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Link href={{ pathname: "/factions" }} className="hover:underline">
            Settlements
          </Link>
          {faction && (
            <>
              <span aria-hidden>·</span>
              <FactionTag factionId={faction.id} />
            </>
          )}
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <h1 className="text-3xl font-semibold">{s.name}</h1>
          <span className="text-sm text-stone-500">
            {TIER_LABELS[s.tier] ?? s.tier}
          </span>
        </div>
        {region && (
          <p className="text-sm opacity-70">
            in <RegionTag regionId={region.id} />
          </p>
        )}
      </header>

      {/* ----- Stat line ----- */}
      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat
            label="Population"
            value={`${s.population} / ${s.populationCap}`}
            sub={`${populationPct}% of cap`}
          />
          <Stat label="Tier" value={TIER_LABELS[s.tier] ?? s.tier} />
          <Stat
            label="Founded"
            value={s.foundedAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <Stat label="Districts" value="—" sub="Phase 3" />
        </dl>
      </section>

      {/* ----- Two columns: districts placeholder + neighbours ----- */}
      <section className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-lg font-semibold mb-4">Districts</h2>
          <p className="text-sm opacity-60 italic">
            Districts, supply chains, and garrison composition come online in
            Phase 3 once the mod is writing them.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">
            Other {faction?.displayName ?? "faction"} settlements
          </h2>
          {siblings.length === 0 ? (
            <p className="text-sm opacity-60 italic">
              This is the only settlement {faction?.displayName ?? "this faction"} holds.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {siblings.map((other) => (
                <li key={other.id}>
                  <SettlementTag settlementId={other.id} withTier />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ----- Recent events ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Recent {faction?.displayName ?? "faction"} events
        </h2>
        <p className="text-xs opacity-50 mb-3">
          Settlement-scoped events arrive in Phase 3; for now this is everything
          recent from {faction?.displayName ?? "this faction"}.
        </p>
        <AuditFeed
          events={events}
          empty="No recent activity from this faction."
        />
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
  value: string;
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
