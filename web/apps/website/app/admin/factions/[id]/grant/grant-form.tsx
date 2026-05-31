"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitGrant, type GrantState } from "./actions";

type Props = {
  factionId: string;
  factionDisplayName: string;
};

const initialState: GrantState = {};

export function GrantForm({ factionId, factionDisplayName }: Props) {
  const boundAction = submitGrant.bind(null, factionId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-widest opacity-60 mb-1">
          Currency
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="currency" value="coin" defaultChecked />
            <span>Coin</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="currency" value="dp" />
            <span>Diplomacy Points</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="amount" className="block text-xs uppercase tracking-widest opacity-60 mb-1">
          Amount
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          min="1"
          step="1"
          required
          placeholder="e.g. 500"
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 tabular-nums"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-xs uppercase tracking-widest opacity-60 mb-1">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          placeholder={`Why is ${factionDisplayName} receiving this? Audit record will keep this verbatim.`}
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-current px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Granting…" : "Grant"}
        </button>
        <Link
          href={{ pathname: `/factions/${factionId}/dashboard` }}
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
            Grant succeeded.
          </p>
          <p className="opacity-80">
            New balances: Coin{" "}
            <strong className="tabular-nums">
              {state.result.treasuryCoin.toLocaleString()}
            </strong>
            , DP{" "}
            <strong className="tabular-nums">
              {state.result.treasuryDp.toLocaleString()}
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
