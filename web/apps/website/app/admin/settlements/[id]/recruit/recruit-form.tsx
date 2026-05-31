"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRecruit, type RecruitState } from "./actions";

type Props = {
  settlementId: number;
};

const initialState: RecruitState = {};

export function RecruitForm({ settlementId }: Props) {
  const boundAction = submitRecruit.bind(null, settlementId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <div>
        <label
          htmlFor="unitType"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Unit type
        </label>
        <input
          type="text"
          id="unitType"
          name="unitType"
          required
          pattern="[a-z0-9_]{2,64}"
          placeholder="e.g. citadel_guard"
          className="w-full font-mono rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        />
      </div>

      <div>
        <label
          htmlFor="count"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Count
        </label>
        <input
          type="number"
          id="count"
          name="count"
          min="1"
          max="1000"
          step="1"
          required
          placeholder="1..1000"
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 tabular-nums"
        />
        <p className="mt-1 text-xs opacity-50">
          Costs 10 Coin each + 1 available population each.
        </p>
      </div>

      <div>
        <label
          htmlFor="reason"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          placeholder="Recorded verbatim in the audit log."
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-current px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Recruiting…" : "Recruit"}
        </button>
        <Link
          href={{ pathname: `/settlements/${settlementId}` }}
          className="text-xs underline opacity-70 hover:opacity-100"
        >
          Cancel
        </Link>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded border border-red-700/40 bg-red-700/5 p-3 text-sm text-red-700 dark:text-red-400"
        >
          {state.error}
        </div>
      )}
      {state.ok && state.result && (
        <div
          role="status"
          className="rounded border border-emerald-700/40 bg-emerald-700/5 p-3 text-sm space-y-1"
        >
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Recruitment succeeded.
          </p>
          <p className="opacity-80">
            Stack total now{" "}
            <strong className="tabular-nums">
              {state.result.unitStackCount}
            </strong>
            . Faction Coin{" "}
            <strong className="tabular-nums">
              {state.result.treasuryCoin.toLocaleString()}
            </strong>
            .
          </p>
          <p className="opacity-60 text-xs">
            Audit event{" "}
            <code className="font-mono">#{state.result.auditEventId}</code>.
          </p>
        </div>
      )}
    </form>
  );
}
