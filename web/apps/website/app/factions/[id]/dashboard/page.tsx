import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getFaction,
  getSubfactions,
  getSettlementsByFaction,
  getRegionsClaimedBy,
  getUnitsByFaction,
  getResourceStocksByFaction,
} from "@/lib/data/factions";
import {
  getCharactersByFaction,
  getActiveCharacterForPlayer,
} from "@/lib/data/characters";
import { getRecentEvents } from "@/lib/data/events";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki"; // shared admin helper
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";
import { SettlementTag } from "@/components/tags/settlement-tag";
import { CharacterTag } from "@/components/tags/character-tag";
import { AuditFeed } from "@/components/audit-feed";

// Faction-scoped, per-user. Never prerender.
export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const f = await getFaction(id);
  if (!f) return { title: "Faction not found" };
  return {
    title: `${f.displayName} dashboard — Middle-earth`,
  };
}

export default async function FactionDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const f = await getFaction(id);
  if (!f) notFound();

  // Permission check: must be a member of this faction (or an admin).
  const session = await safeAuth();
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=/factions/${id}/dashboard`);
  }
  const viewerCharacter = await getActiveCharacterForPlayer(session.user.discordId);
  const isFactionMember = viewerCharacter?.factionId === f.id;
  const isViewerAdmin = isAdmin(session.user.discordId);
  if (!isFactionMember && !isViewerAdmin) {
    // Other-faction or character-less viewers get sent to the public page.
    redirect(`/factions/${id}`);
  }

  const [parent, subs, settlements, regions, characters, units, resources, events] =
    await Promise.all([
      f.parentFactionId ? getFaction(f.parentFactionId) : Promise.resolve(null),
      getSubfactions(f.id),
      getSettlementsByFaction(f.id),
      getRegionsClaimedBy(f.id),
      getCharactersByFaction(f.id),
      getUnitsByFaction(f.id),
      getResourceStocksByFaction(f.id),
      // Include 'faction' visibility events too on the internal dashboard,
      // so DAILY_TICK summaries show up here but not on the public page.
      getRecentEvents({
        visibility: ["public", "faction"],
        factionId: f.id,
        touching: true,
        limit: 30,
      }),
    ]);

  const garrisonTotal = units.reduce((sum, u) => sum + u.count, 0);
  const populationTotal = settlements.reduce((sum, s) => sum + s.population, 0);
  const populationCapTotal = settlements.reduce((sum, s) => sum + s.populationCap, 0);

  // Daily income estimate from the most recent DAILY_TICK event for this faction.
  const lastTick = events.find((e) => e.eventType === "DAILY_TICK");
  const dailyCoinDelta =
    lastTick &&
    typeof lastTick.payload === "object" &&
    lastTick.payload !== null &&
    "coin_delta" in lastTick.payload
      ? Number((lastTick.payload as Record<string, unknown>).coin_delta)
      : null;
  const dailyDpDelta =
    lastTick &&
    typeof lastTick.payload === "object" &&
    lastTick.payload !== null &&
    "dp_delta" in lastTick.payload
      ? Number((lastTick.payload as Record<string, unknown>).dp_delta)
      : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      {/* ----- Header ----- */}
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Link href={{ pathname: `/factions/${f.id}` }} className="hover:underline">
            {f.displayName}
          </Link>
          <span aria-hidden>·</span>
          <span>Internal dashboard</span>
          {isViewerAdmin && !isFactionMember && (
            <>
              <span aria-hidden>·</span>
              <span className="text-amber-600">admin view</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-3 mb-1">
          {f.bannerHex && (
            <span
              aria-hidden
              className="inline-block h-6 w-6 rounded border border-stone-300 dark:border-stone-700"
              style={{ backgroundColor: f.bannerHex }}
            />
          )}
          <h1 className="text-3xl font-semibold">{f.displayName}</h1>
        </div>
        {parent && (
          <p className="text-sm opacity-70">
            within <FactionTag factionId={parent.id} />
          </p>
        )}
      </header>

      {/* ----- Treasury ----- */}
      <section className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
        <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
          Treasury
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat
            label="Coin"
            value={f.treasuryCoin.toLocaleString()}
            sub={dailyCoinDelta != null ? `+${dailyCoinDelta} last tick` : undefined}
          />
          <Stat
            label="Diplomacy Points"
            value={f.treasuryDp.toLocaleString()}
            sub={dailyDpDelta != null ? `+${dailyDpDelta} last tick` : undefined}
          />
          <Stat
            label="Settlements"
            value={settlements.length.toString()}
            sub={`${regions.length} regions`}
          />
          <Stat
            label="Population"
            value={populationTotal.toLocaleString()}
            sub={`${Math.round((populationTotal / Math.max(1, populationCapTotal)) * 100)}% of cap`}
          />
        </dl>
      </section>

      {/* ----- Military ----- */}
      <section className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
        <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
          Military
        </h2>
        <p className="text-xs opacity-50 mb-4 tabular-nums">
          {garrisonTotal} troops across {units.length} unit type{units.length === 1 ? "" : "s"}.
        </p>
        {units.length === 0 ? (
          <p className="text-sm opacity-60 italic">No standing forces.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {units.map((u) => (
              <li
                key={u.id}
                className="flex items-baseline justify-between border-b border-stone-100 dark:border-stone-900 py-1.5"
              >
                <span>{prettyType(u.unitType)}</span>
                <span className="tabular-nums opacity-70">{u.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ----- Two columns: settlements + resources ----- */}
      <section className="grid md:grid-cols-2 gap-8">
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
            Settlements
          </h2>
          {settlements.length === 0 ? (
            <p className="text-sm opacity-60 italic">No settlements founded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {settlements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-2 border-b border-stone-100 dark:border-stone-900 py-1.5"
                >
                  <SettlementTag settlementId={s.id} withTier />
                  <span className="text-xs text-stone-500 tabular-nums shrink-0">
                    {s.population} / {s.populationCap}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
            Resource stocks
          </h2>
          {resources.length === 0 ? (
            <p className="text-sm opacity-60 italic">No stockpiled resources.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {resources.map((r) => (
                <li
                  key={r.resourceId}
                  className="flex items-baseline justify-between border-b border-stone-100 dark:border-stone-900 py-1.5"
                >
                  <span className="font-mono text-xs">{r.resourceId}</span>
                  <span className="tabular-nums opacity-70">{r.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ----- Subfactions ----- */}
      {subs.length > 0 && (
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
            Subfactions
          </h2>
          <ul className="space-y-2 text-sm">
            {subs.map((sub) => (
              <li key={sub.id}>
                <FactionTag factionId={sub.id} />
                <span className="text-xs text-stone-500 ml-2">
                  {sub.loreSummary}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Members ----- */}
      <section className="rounded-lg border border-stone-200 dark:border-stone-800 p-6">
        <h2 className="text-sm uppercase tracking-widest opacity-60 mb-4">
          Members
        </h2>
        {characters.length === 0 ? (
          <p className="text-sm opacity-60 italic">No active members.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...characters]
              .sort((a, b) => b.influence - a.influence)
              .map((c) => (
                <li key={c.id} className="flex items-baseline gap-3 flex-wrap">
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
        )}
      </section>

      {/* ----- Audit feed ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Faction activity</h2>
        <AuditFeed
          events={events}
          empty="No recent activity. Run a tick to see things change."
        />
      </section>

      {/* ----- Phase 5 footer ----- */}
      <section className="border-t border-stone-200 dark:border-stone-800 pt-4 text-xs opacity-60 space-y-1">
        <p>
          Diplomatic actions (declare war, propose alliance, open trade) and
          recruitment / mobilisation arrive in Phase 5.
        </p>
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
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs opacity-50">{sub}</dd>}
    </div>
  );
}

function prettyType(snake: string): string {
  return snake
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
