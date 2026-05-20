import Link from "next/link";
import { LinkForm } from "./link-form";
import { existingLink } from "./actions";

export const dynamic = "force-dynamic";

export default async function LinkPage() {
  const existing = await existingLink();
  const mockEnabled =
    process.env.MOD_API_MOCK === "1" || !process.env.MOD_API_URL;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
        Phase 1 &middot; Foundation
      </p>
      <h1 className="mb-4 text-3xl font-semibold">Link Minecraft</h1>
      <p className="mb-6 opacity-80">
        When you connect to the Minecraft server for the first time, you&apos;ll
        see a one-time code in chat. Paste it below to bind your Minecraft
        account to your Discord login.
      </p>

      {existing ? (
        <div className="mb-8 rounded border border-emerald-700/40 bg-emerald-700/5 p-4 text-sm">
          <p>
            Already linked to{" "}
            <strong className="font-mono">{existing.mcUsername}</strong>{" "}
            <span className="opacity-60">({existing.mcUuid})</span>.
          </p>
          <p className="mt-2 opacity-80">
            You can re-link to a different Minecraft account by entering a new
            code. The current binding will be replaced.
          </p>
        </div>
      ) : null}

      <LinkForm mockEnabled={mockEnabled} />

      <p className="mt-10 text-sm opacity-70">
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </section>
  );
}
