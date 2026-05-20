import Link from "next/link";
import { safeAuth, lookupMcLink } from "@/lib/auth-helpers";
import { ComingSoon } from "@/components/coming-soon";

export default async function DashboardPage() {
  const session = await safeAuth();
  const user = session!.user;
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
