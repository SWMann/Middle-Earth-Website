/**
 * Presentational helpers shared by the review queue + detail pages. Server-
 * safe (no hooks), so both server components import them directly.
 */
import type { ReactNode } from "react";

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-stone-400";
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBar(score: number | null | undefined): string {
  if (score == null) return "bg-stone-400";
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

const STATUS_STYLE: Record<string, string> = {
  pending_spot: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  pending_full: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
  auto_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  unscanned: "bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/40",
};

const STATUS_LABEL: Record<string, string> = {
  pending_spot: "Spot-check",
  pending_full: "Full review",
  auto_approved: "Auto-approved",
  approved: "Approved",
  rejected: "Rejected",
  unscanned: "Unscanned",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? STATUS_STYLE.unscanned;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PassChip({ ok, label }: { ok: boolean; label: string }) {
  const cls = ok
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
    : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${cls}`}>
      <span aria-hidden>{ok ? "✓" : "✗"}</span>
      {label}
    </span>
  );
}

/** A labelled 0–100 bar; renders "N/A" when the criterion didn't apply. */
export function CriterionBar({
  label,
  weight,
  score,
}: {
  label: string;
  weight: number;
  score: number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0 text-sm">
        {label}
        <span className="ml-1.5 text-[10px] text-stone-400 tabular-nums">{weight}%</span>
      </div>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
        {score != null && (
          <div
            className={`absolute inset-y-0 left-0 rounded ${scoreBar(score)}`}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        )}
      </div>
      <div className={`w-10 shrink-0 text-right text-sm tabular-nums ${scoreColor(score)}`}>
        {score == null ? "—" : score}
      </div>
    </div>
  );
}

export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
