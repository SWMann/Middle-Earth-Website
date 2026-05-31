"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitClaim, type ClaimState } from "./actions";

type RegionOption = {
  id: string;
  displayName: string;
  biome: string;
  claimedByFactionId: string | null;
};

type FactionOption = {
  id: string;
  displayName: string;
  treasuryDp: number;
};

type Props = {
  regions: RegionOption[];
  factions: FactionOption[];
};

const initialState: ClaimState = {};

export function ClaimForm({ regions, factions }: Props) {
  const [state, formAction, pending] = useActionState(submitClaim, initialState);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <div>
        <label
          htmlFor="regionId"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Region
        </label>
        <select
          id="regionId"
          name="regionId"
          required
          defaultValue=""
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        >
          <option value="" disabled>
            — pick a region —
          </option>
          <optgroup label="Unclaimed">
            {regions
              .filter((r) => !r.claimedByFactionId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.displayName} ({r.biome})
                </option>
              ))}
          </optgroup>
          <optgroup label="Already claimed (bridge will 409)">
            {regions
              .filter((r) => r.claimedByFactionId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.displayName} (held by {r.claimedByFactionId})
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label
          htmlFor="factionId"
          className="block text-xs uppercase tracking-widest opacity-60 mb-1"
        >
          Faction
        </label>
        <select
          id="factionId"
          name="factionId"
          required
          defaultValue=""
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        >
          <option value="" disabled>
            — pick a faction —
          </option>
          {factions.map((f) => (
            <option
              key={f.id}
              value={f.id}
              disabled={f.treasuryDp < 240}
            >
              {f.displayName} — {f.treasuryDp.toLocaleString()} DP
              {f.treasuryDp < 240 ? " (insufficient)" : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs opacity-50">
          Costs 240 DP. Factions under that threshold are disabled in the
          list.
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
          placeholder="Recorded verbatim in the audit log; visible on the public feed."
          className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-current px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Claiming…" : "Claim"}
        </button>
        <Link
          href={{ pathname: "/map" }}
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
            Claim recorded.
          </p>
          <p className="opacity-80">
            <strong>{state.result.regionDisplayName}</strong> (
            <code className="font-mono">{state.result.regionId}</code>) now
            held by <strong>{state.result.factionDisplayName}</strong>.
          </p>
          <p className="opacity-80">
            New DP balance:{" "}
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
