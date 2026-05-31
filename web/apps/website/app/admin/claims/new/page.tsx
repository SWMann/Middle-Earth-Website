import { notFound, forbidden } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getAllFactions } from "@/lib/data/factions";
import { getAllRegionsWithClaims } from "@/lib/data/regions";
import { ClaimForm } from "./claim-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin: Claim a region — Middle-earth",
};

export default async function NewClaimPage() {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const [factions, regions] = await Promise.all([
    getAllFactions(),
    getAllRegionsWithClaims(),
  ]);

  const unclaimed = regions.filter((r) => !r.claimedByFactionId);
  const claimed = regions.filter((r) => r.claimedByFactionId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Admin &middot;{" "}
          <Link href={{ pathname: "/map" }} className="hover:underline">
            Map
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Claim a region</h1>
        <p className="mt-2 text-sm opacity-70 max-w-lg">
          Records a region claim for a faction at a flat cost of{" "}
          <strong>240 Diplomacy Points</strong>. Routed through the Andúril
          bridge. Contiguity is not enforced yet — admin can claim
          anything.
        </p>
      </header>

      <section className="rounded border border-stone-200 dark:border-stone-800 p-4 text-sm space-y-3">
        <p className="text-xs uppercase tracking-widest opacity-60">
          Region availability
        </p>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs opacity-60">Unclaimed</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {unclaimed.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Already claimed</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {claimed.length}
            </dd>
          </div>
        </dl>
        {unclaimed.length === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Every seeded region is claimed. Add new regions via the database
            seed or admin tools before more claims can land.
          </p>
        )}
      </section>

      <ClaimForm
        regions={regions.map((r) => ({
          id: r.id,
          displayName: r.displayName,
          biome: r.biome,
          claimedByFactionId: r.claimedByFactionId,
        }))}
        factions={factions.map((f) => ({
          id: f.id,
          displayName: f.displayName,
          treasuryDp: f.treasuryDp,
        }))}
      />

      <section className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4 space-y-1">
        <p>
          Bridge endpoint:{" "}
          <code className="font-mono">POST /api/v1/claims</code>
        </p>
        <p>
          On success this redirects via cache invalidation; the map and the
          claiming faction&apos;s page will show the new claim on next load.
        </p>
      </section>
    </div>
  );
}
