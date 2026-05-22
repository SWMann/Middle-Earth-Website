import Link from "next/link";
import { redirect } from "next/navigation";
import { safeAuth, lookupMcLink } from "@/lib/auth-helpers";
import { ComingSoon } from "@/components/coming-soon";

// Auth-gated. Middleware enforces it at request time; this directive stops
// Next from trying to statically prerender (which fails because there's no
// session during build).
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await safeAuth();
  // Middleware redirects unauthed users before they hit this page, but during
  // build/SSG there's no middleware, so we still defend.
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/dashboard");
  const user = session.user;
  const mcLink = await lookupMcLink(user.discordId);
  return (
    <ComingSoon title="Dashboard" phase="Phase 3 — Player Dashboards">
      <p>
        Signed in as <strong>{user.discordUsername}</strong> (Discord
        ID&nbsp;<code>{user.discordId}</code>).
      </p>
      {mcLink ? (
        <p className="text-emerald-700 dark:text-emerald-400">
          Minecraft account linked: <strong>{mcLink.mcUsername}</strong>. The
          dashboard&apos;s real content (treasury, settlements, action queue,
          alerts) arrives in Phase 3 once the mod is writing game state.
        </p>
      ) : (
        <p>
          Your Discord account is not yet linked to a Minecraft account.{" "}
          <Link href="/link" className="underline">
            Link Minecraft &rarr;
          </Link>
        </p>
      )}
    </ComingSoon>
  );
}
