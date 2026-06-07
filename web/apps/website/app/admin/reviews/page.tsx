import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getReviewQueue, type ReviewQueueItem } from "@/lib/data/reviews";
import { StatusBadge, PassChip, scoreColor, timeAgo } from "./ui";

// Admin-only review queue; never statically rendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build Reviews — Admin",
  description: "Approve or reject scanned in-game builds.",
};

function pass(result: unknown): boolean | null {
  if (result && typeof result === "object" && "pass" in result) {
    return Boolean((result as { pass?: unknown }).pass);
  }
  return null;
}

export default async function ReviewsPage() {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const queue = await getReviewQueue();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">Admin · Operations</p>
        <h1 className="text-3xl font-semibold">Build Reviews</h1>
        <p className="mt-3 max-w-2xl text-sm opacity-70">
          Plots the in-game scanner flagged for a human look — builds that
          scored below their settlement tier&apos;s threshold, failed component
          or footprint validation, or couldn&apos;t be auto-verified. Approving
          a plot linked to a district activates that district.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="rounded border border-stone-200 dark:border-stone-800 p-8 text-center text-sm opacity-70">
          Nothing awaiting review. Plots appear here when a player runs{" "}
          <code className="font-mono text-xs">/anduril scan</code> in-game and the
          result doesn&apos;t auto-approve.
        </div>
      ) : (
        <ul className="space-y-3">
          {queue.map((p: ReviewQueueItem) => {
            const compPass = pass(p.componentResult);
            const footPass = pass(p.footprintResult);
            const w = p.maxX - p.minX + 1;
            const d = p.maxZ - p.minZ + 1;
            const h = p.maxY - p.minY + 1;
            return (
              <li
                key={p.id}
                className="rounded border border-stone-200 dark:border-stone-800 p-4 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Link
                    href={{ pathname: `/admin/reviews/${p.id}` }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-semibold hover:underline">
                        {p.districtName ?? p.districtType}
                      </span>
                      <span className="font-mono text-xs text-stone-500">#{p.id}</span>
                      {p.label && <span className="text-xs text-stone-500">“{p.label}”</span>}
                      <span className="ml-auto text-xs text-stone-400">{timeAgo(p.scannedAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1.5">
                        {p.bannerHex && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: p.bannerHex }}
                          />
                        )}
                        {p.factionName ?? p.factionId ?? "no faction"}
                      </span>
                      <span>
                        {p.settlementName ?? "unanchored"}
                        {p.settlementTier ? ` · ${p.settlementTier}` : ""}
                      </span>
                      <span className="tabular-nums">
                        {w}×{h}×{d} · footprint {w * d}
                      </span>
                      <span className="font-mono">{p.source}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {compPass != null && <PassChip ok={compPass} label="components" />}
                      {footPass != null && <PassChip ok={footPass} label="footprint" />}
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className={`text-2xl font-semibold tabular-nums ${scoreColor(p.decorationScore)}`}>
                      {p.decorationScore ?? "—"}
                      <span className="text-xs font-normal text-stone-400">/100</span>
                    </div>
                    <StatusBadge status={p.reviewStatus} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
