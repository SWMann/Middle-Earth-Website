import { notFound, forbidden } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import {
  getSettlement,
  getUnitsGarrisonedAt,
} from "@/lib/data/settlements";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";
import { RecruitForm } from "./recruit-form";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const metadata = {
  title: "Admin: Recruit units — Middle-earth",
};

export default async function AdminRecruitPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const settlementId = Number(id);
  if (!Number.isFinite(settlementId)) notFound();

  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const settlement = await getSettlement(settlementId);
  if (!settlement) notFound();
  const [faction, garrison] = await Promise.all([
    getFaction(settlement.factionId),
    getUnitsGarrisonedAt(settlementId),
  ]);
  const garrisonTotal = garrison.reduce((sum, u) => sum + u.count, 0);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Admin &middot;{" "}
          <Link
            href={{ pathname: `/settlements/${settlement.id}` }}
            className="hover:underline"
          >
            {settlement.name}
          </Link>
          {faction && (
            <>
              {" · "}
              <FactionTag factionId={faction.id} />
            </>
          )}
        </p>
        <h1 className="text-2xl font-semibold">Recruit units</h1>
        <p className="mt-2 text-sm opacity-70 max-w-lg">
          Recruits unit stacks at <strong>{settlement.name}</strong>. Costs{" "}
          <strong>10 Coin</strong> per unit from{" "}
          {faction?.displayName ?? "the faction"}&apos;s treasury, and uses
          one available population per unit. Routed through the Andúril
          bridge mod.
        </p>
      </header>

      <section className="rounded border border-stone-200 dark:border-stone-800 p-4 text-sm space-y-3">
        <p className="text-xs uppercase tracking-widest opacity-60">
          Current state
        </p>
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs opacity-60">Population</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {settlement.population} / {settlement.populationCap}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Faction Coin</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {faction?.treasuryCoin.toLocaleString() ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Garrison total</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {garrisonTotal}
            </dd>
          </div>
        </dl>
        {garrison.length > 0 && (
          <details className="text-xs opacity-70">
            <summary className="cursor-pointer">Existing stacks</summary>
            <ul className="mt-2 space-y-1">
              {garrison.map((u) => (
                <li
                  key={u.id}
                  className="flex items-baseline justify-between"
                >
                  <span>{prettyType(u.unitType)}</span>
                  <span className="tabular-nums">{u.count}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <RecruitForm settlementId={settlement.id} />

      <section className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4 space-y-1">
        <p>
          Bridge endpoint:{" "}
          <code className="font-mono">
            POST /api/v1/settlements/{settlement.id}/recruitments
          </code>
        </p>
        <p>
          Unit type is free-form (matches{" "}
          <code className="font-mono">[a-z0-9_]{"{2,64}"}</code>). The seed
          uses values like <code className="font-mono">citadel_guard</code>,
          {" "}<code className="font-mono">rohirrim</code>,{" "}
          <code className="font-mono">uruk_hai</code>.
        </p>
      </section>
    </div>
  );
}

function prettyType(snake: string): string {
  return snake
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
