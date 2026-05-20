import Link from "next/link";
import { safeAuth } from "@/lib/auth-helpers";

export default async function HomePage() {
  const session = await safeAuth();
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
        Late Third Age &middot; Phase 1
      </p>
      <h1 className="mb-6 text-4xl font-semibold leading-tight">
        Canon is a starting point, not a cage.
      </h1>
      <p className="mb-4 opacity-80">
        A modded Minecraft server set in late Third Age Middle-earth. Players
        belong to factions &mdash; major canon ones and player-founded minor
        ones &mdash; and build, trade, fight, and tell stories together.
      </p>
      <p className="mb-8 opacity-80">
        The systems are deep, interlocking, and rewarding to master &mdash; but
        they do not require a wiki binder and three staff approvals to engage
        with. The mod does the bookkeeping; the website shows the state; the
        player makes the decisions.
      </p>
      <div className="flex gap-4 text-sm">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="rounded border border-current px-4 py-2 hover:opacity-80"
          >
            Open your dashboard
          </Link>
        ) : (
          <Link
            href="/api/auth/signin"
            className="rounded border border-current px-4 py-2 hover:opacity-80"
          >
            Apply to join
          </Link>
        )}
        <Link
          href="/wiki"
          className="rounded border border-current px-4 py-2 hover:opacity-80"
        >
          Read the wiki
        </Link>
      </div>
    </section>
  );
}
