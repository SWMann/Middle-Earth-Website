"use client";

import { useActionState, useState, useTransition } from "react";
import { redeemLinkCodeAction, devSeedAction, type LinkState } from "./actions";

const initialState: LinkState = {};

export function LinkForm({ mockEnabled }: { mockEnabled: boolean }) {
  const [state, formAction, isPending] = useActionState(redeemLinkCodeAction, initialState);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [devUser, setDevUser] = useState<string | null>(null);
  const [seedPending, startSeed] = useTransition();

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="opacity-80">One-time code</span>
          <input
            name="code"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            minLength={4}
            maxLength={12}
            defaultValue={devCode ?? ""}
            placeholder="e.g. AB23X9"
            className="rounded border border-current/30 bg-transparent px-3 py-2 font-mono text-lg uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-current"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-current px-4 py-2 text-sm disabled:opacity-50"
        >
          {isPending ? "Linking…" : "Link account"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Linked Minecraft account{" "}
          <strong className="font-mono">{state.success.mcUsername}</strong>.
        </p>
      )}

      {mockEnabled && (
        <div className="rounded border border-dashed border-current/40 p-4 text-sm">
          <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
            Dev seeder (mock mode)
          </p>
          <p className="mb-3 opacity-80">
            The mod isn&apos;t writing real codes yet. Click to issue a fake
            code you can redeem in the form above.
          </p>
          <button
            type="button"
            onClick={() =>
              startSeed(async () => {
                const seed = await devSeedAction();
                if (seed) {
                  setDevCode(seed.code);
                  setDevUser(seed.mcUsername);
                }
              })
            }
            disabled={seedPending}
            className="rounded border border-current px-3 py-1 text-xs disabled:opacity-50"
          >
            {seedPending ? "Issuing…" : "Issue a fake code"}
          </button>
          {devCode && (
            <p className="mt-3 font-mono text-xs opacity-80">
              code: <strong>{devCode}</strong> &middot; would link as{" "}
              <strong>{devUser}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
