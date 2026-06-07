import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getPlotForReview } from "@/lib/data/reviews";
import { StatusBadge, PassChip, CriterionBar, Meta, scoreColor, timeAgo } from "../ui";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

type Params = { id: string };

type ComponentResult = {
  required?: { componentId: string; need: number; found: number; ok: boolean; uncertain?: boolean }[];
  pass?: boolean;
  uncertain?: boolean;
};
type FootprintResult = {
  areaBlocks?: number;
  minFootprint?: number | null;
  maxFootprint?: number | null;
  heightBlocks?: number;
  minHeight?: number | null;
  buildingCount?: number;
  requiredBuildings?: { slotKey: string; need: number; max: number | null; found: number | null; ok: boolean }[];
  buildingsVerified?: boolean;
  pass?: boolean;
};

const PENDING = new Set(["pending_spot", "pending_full"]);

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return { title: `Review plot #${id} — Admin` };
}

export default async function ReviewDetailPage({ params }: { params: Promise<Params> }) {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const data = await getPlotForReview(numId);
  if (!data) notFound();
  const { plot, criteria } = data;

  const breakdown = (plot.criteriaBreakdown ?? {}) as Record<string, number>;
  const comp = (plot.componentResult ?? {}) as ComponentResult;
  const foot = (plot.footprintResult ?? {}) as FootprintResult;

  const w = plot.maxX - plot.minX + 1;
  const d = plot.maxZ - plot.minZ + 1;
  const h = plot.maxY - plot.minY + 1;
  const isPending = PENDING.has(plot.reviewStatus);
  const reviewerLabel = session?.user?.discordId ?? "admin";

  // Proportional box preview (read-only). Floorplanner plots (Phase D) get a
  // full layout render; a command scan only has its bounding box.
  const previewW = 220;
  const previewH = Math.max(40, Math.round((previewW * d) / Math.max(1, w)));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div>
        <Link href={{ pathname: "/admin/reviews" }} className="text-sm opacity-60 hover:underline">
          ← Back to queue
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest opacity-60">
            Plot #{plot.id} · {plot.source}
          </p>
          <h1 className="text-3xl font-semibold">{plot.districtName ?? plot.districtType}</h1>
          {plot.label && <p className="mt-1 text-sm opacity-60">“{plot.label}”</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`text-4xl font-semibold tabular-nums ${scoreColor(plot.decorationScore)}`}>
            {plot.decorationScore ?? "—"}
            <span className="text-sm font-normal text-stone-400">/100</span>
          </div>
          <StatusBadge status={plot.reviewStatus} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded border border-stone-200 dark:border-stone-800 p-4">
        <Meta label="Faction">
          <span className="inline-flex items-center gap-1.5">
            {plot.bannerHex && (
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: plot.bannerHex }} />
            )}
            {plot.factionName ?? plot.factionId ?? "—"}
          </span>
        </Meta>
        <Meta label="Settlement">
          {plot.settlementName ?? "unanchored"}
          {plot.settlementTier ? ` · ${plot.settlementTier}` : ""}
        </Meta>
        <Meta label="District link">
          {plot.districtId != null ? `#${plot.districtId}` : "none"}
        </Meta>
        <Meta label="Review mode">{plot.reviewMode ?? "—"}</Meta>
        <Meta label="Scanned">{timeAgo(plot.scannedAt)}</Meta>
        <Meta label="Footprint">
          <span className="tabular-nums">{w * d} blocks</span>
        </Meta>
        <Meta label="Box">
          <span className="tabular-nums">{w}×{h}×{d}</span>
        </Meta>
        <Meta label="Scan audit">
          {plot.scanAuditEventId != null ? `#${plot.scanAuditEventId}` : "—"}
        </Meta>
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Decoration criteria</h2>
        <div className="space-y-2 rounded border border-stone-200 dark:border-stone-800 p-4">
          {criteria.map((c) => (
            <CriterionBar
              key={c.id}
              label={c.displayName}
              weight={c.weightPct}
              score={c.id in breakdown ? breakdown[c.id] : null}
            />
          ))}
          <p className="pt-1 text-[11px] text-stone-400">
            A criterion shows “—” when it didn&apos;t apply to this build (e.g. no
            culture for theme, no requirements for furnishing); the weighted total
            renormalises over the rest.
          </p>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-widest opacity-60">
            Components{" "}
            {comp.pass != null && <PassChip ok={comp.pass} label={comp.pass ? "pass" : "fail"} />}
          </h2>
          <div className="rounded border border-stone-200 dark:border-stone-800 p-4 space-y-1.5 text-sm">
            {comp.required && comp.required.length > 0 ? (
              comp.required.map((r) => (
                <div key={r.componentId} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{r.componentId}</span>
                  <span className="flex items-center gap-2">
                    <span className={`tabular-nums ${r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {r.found}/{r.need}
                    </span>
                    {r.uncertain && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-500">uncertain</span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="opacity-60">No required components for this district.</p>
            )}
            {comp.uncertain && (
              <p className="pt-1 text-[11px] text-amber-500">
                Some detections were low-confidence (composite/proxy) — verify in-world.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-widest opacity-60">
            Footprint{" "}
            {foot.pass != null && <PassChip ok={foot.pass} label={foot.pass ? "pass" : "fail"} />}
          </h2>
          <div className="rounded border border-stone-200 dark:border-stone-800 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="opacity-60">Area</span>
              <span className="tabular-nums">
                {foot.areaBlocks ?? w * d}
                {(foot.minFootprint != null || foot.maxFootprint != null) && (
                  <span className="opacity-50">
                    {" "}({foot.minFootprint ?? 0}–{foot.maxFootprint ?? "∞"})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Height</span>
              <span className="tabular-nums">
                {foot.heightBlocks ?? h}
                {foot.minHeight != null && <span className="opacity-50"> (min {foot.minHeight})</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Buildings</span>
              <span className={foot.buildingsVerified ? "" : "text-amber-500"}>
                {foot.buildingsVerified ? "verified" : "unverified → review"}
              </span>
            </div>
            {foot.requiredBuildings && foot.requiredBuildings.length > 0 && (
              <div className="pt-1 space-y-1">
                {foot.requiredBuildings.map((b) => (
                  <div key={b.slotKey} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] truncate">{b.slotKey}</span>
                    <span className="tabular-nums text-xs opacity-70">
                      {b.found ?? "?"}/{b.need}
                      {b.max != null && b.max !== b.need ? `–${b.max}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Plot preview</h2>
        <div className="rounded border border-stone-200 dark:border-stone-800 p-4">
          <svg
            width={previewW}
            height={previewH}
            viewBox={`0 0 ${previewW} ${previewH}`}
            className="rounded bg-stone-100 dark:bg-stone-900"
          >
            <rect
              x={1}
              y={1}
              width={previewW - 2}
              height={previewH - 2}
              className="fill-amber-500/10 stroke-amber-500/60"
              strokeWidth={1.5}
            />
            <text x={previewW / 2} y={previewH / 2} textAnchor="middle" dominantBaseline="middle" className="fill-stone-500 text-[11px]">
              {w} × {d} blocks
            </text>
          </svg>
          <p className="mt-2 text-[11px] text-stone-400">
            {plot.footprintCells || plot.layout
              ? "Floorplanner plot — full layout render lands with the floorplanner."
              : "Command scan — bounding box only (no floorplan)."}
            {" "}World box ({plot.minX}, {plot.minY}, {plot.minZ}) → ({plot.maxX}, {plot.maxY}, {plot.maxZ}).
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Decision</h2>
        {isPending ? (
          <ReviewForm plotId={plot.id} reviewerLabel={reviewerLabel} />
        ) : (
          <div className="rounded border border-stone-200 dark:border-stone-800 p-4 text-sm">
            This plot is <strong>{plot.reviewStatus}</strong>
            {plot.reviewedBy ? <> — reviewed by {plot.reviewedBy}</> : null}.
            {plot.reviewNote && <p className="mt-1 opacity-70">“{plot.reviewNote}”</p>}
          </div>
        )}
      </section>
    </div>
  );
}
