import { notFound, forbidden } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";
import { GrantForm } from "./grant-form";

// Admin-gated, per-user, must never be statically rendered.
export const dynamic = "force-dynamic";

type Params = { id: string };

export const metadata = {
  title: "Admin: Grant treasury — Middle-earth",
};

export default async function AdminGrantPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const faction = await getFaction(id);
  if (!faction) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Admin &middot;{" "}
          <Link
            href={{ pathname: `/factions/${faction.id}` }}
            className="hover:underline"
          >
            {faction.displayName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Grant treasury</h1>
        <p className="mt-2 text-sm opacity-70 max-w-lg">
          Mints Coin or DP directly into{" "}
          <FactionTag factionId={faction.id} />
          &apos;s treasury. Records an{" "}
          <code className="font-mono">ADMIN_GRANT</code> audit event with the
          reason. Routed through the Andúril bridge mod — make sure it&apos;s
          running and reachable.
        </p>
      </header>

      <section className="rounded border border-stone-200 dark:border-stone-800 p-4 text-sm space-y-2">
        <p className="text-xs uppercase tracking-widest opacity-60">
          Current treasury
        </p>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs opacity-60">Coin</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {faction.treasuryCoin.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">DP</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {faction.treasuryDp.toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>

      <GrantForm factionId={faction.id} factionDisplayName={faction.displayName} />

      <section className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4 space-y-1">
        <p>
          Bridge endpoint:{" "}
          <code className="font-mono">
            POST /api/v1/admin/factions/{faction.id}/grant
          </code>
        </p>
        <p>
          On success this page&apos;s data is invalidated, but you may need to
          refresh to see the new treasury figure if the dev cache is stale.
        </p>
      </section>
    </div>
  );
}
