"use client";

import { useActionState } from "react";
import { submitReview, type ReviewState } from "./actions";

const initialState: ReviewState = {};

export function ReviewForm({
  plotId,
  reviewerLabel,
}: {
  plotId: number;
  reviewerLabel: string;
}) {
  const [state, formAction, pending] = useActionState(submitReview, initialState);

  if (state.ok && state.result) {
    const r = state.result;
    return (
      <div className="rounded border border-emerald-600/40 bg-emerald-500/10 p-4 text-sm">
        Plot #{r.plotId} is now <strong>{r.reviewStatus}</strong>
        {r.reviewStatus === "approved" && r.districtId != null && (
          <> — district #{r.districtId} activated</>
        )}
        . <span className="opacity-60">(audit #{r.auditEventId})</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="plotId" value={plotId} />
      <div>
        <label
          htmlFor="note"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Review note
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Optional — recorded on the plot and in the audit log."
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        />
      </div>
      <p className="text-xs opacity-60">Reviewing as {reviewerLabel}.</p>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Working…" : "Approve"}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="rounded border border-red-600 px-4 py-2 font-medium text-red-700 dark:text-red-400 hover:bg-red-600/10 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
